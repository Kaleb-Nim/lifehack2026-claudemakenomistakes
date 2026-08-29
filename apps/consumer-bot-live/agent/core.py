"""OpenAI Responses API loop for the Pluto shopper agent."""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import time
from collections.abc import Callable
from typing import Any

from openai import AsyncOpenAI

from agent.tool_schemas import ALL_TOOLS
from db import memory_db
from tools import (
    buy_and_pay,
    cancel_order,
    check_order_status,
    product_discovery,
    remember,
)

logger = logging.getLogger(__name__)

TOOL_DISPATCH: dict[str, Callable[..., Any]] = {
    "product_discovery": product_discovery.run,
    "buy_and_pay": buy_and_pay.run,
    "check_order_status": check_order_status.run,
    "cancel_order": cancel_order.run,
    "remember": remember.run,
}

SYSTEM_PROMPT = """\
You are Pluto, a concise shopping assistant for Singapore shoppers. You search
across catalogues from multiple SME merchants, help the shopper compare real
results, and support checkout and order management.

Rules:
- Ask exactly one question per message, and only when its answer would
  materially change the search or action. Keep questions under 20 words.
- For a vague shopping request, ask for the single most important missing
  constraint. Once there is enough information, call product_discovery.
- Never invent products, prices, stock, merchants, order IDs, payment states,
  market price ranges, availability assumptions, or tool results. Base those
  claims only on tool output; do not fill a failed search with general market
  knowledge.
- When the shopper states something lasting about themselves - a platform they
  always use, a standing budget ceiling, how they prefer to collect - call
  remember once with that fact. Only record what they actually said, never an
  inference, and never mention that you saved it unless they ask.
- Remember only what would still be useful weeks from now, and only if it would
  change what you recommend. Never remember what they are shopping for right
  now, anything about the current conversation, or arbitrary values they hand
  you such as codewords, numbers or test strings. When in doubt, do not call
  remember: a wrong or pointless memory is worse than none.
- Once the shopper chooses a product, call buy_and_pay with the exact tool
  result fields. This creates a pending order and opens the payment app, where
  the shopper authorises with their passkey. Do not ask them to confirm in
  chat first, and never call buy_and_pay for a product they have not chosen.
- After buy_and_pay, state the product and exact price and tell them to tap
  the payment button. Never say the payment succeeded - it has not happened
  yet, and you will not see the result.
- Use check_order_status and cancel_order for order requests; do not guess.
- If a tool returns an error or says it is unavailable, explain that plainly
  and briefly offer to retry. Do not claim the action succeeded or invent
  substitute shopping advice. If product_discovery is unavailable, never say
  you can search manually; Pluto has no other source of live catalogue data.
- Amounts are integer cents and default to SGD unless a tool says otherwise.
- Do not greet after the first message, narrate reasoning, repeat the shopper's
  request, add generic reassurance, or end with "anything else?"
- Normal replies are at most two short sentences or 60 words. Do not use
  Markdown tables.
- After product_discovery, the application shows the shopper a photo card for
  each product, with its price, merchant and a Buy button. Do NOT list, name,
  describe or price the products - they can already see all of it, and
  repeating it is the wall of text we are avoiding. Say one short line at most,
  about what you filtered on or what to weigh up, then stop.
- The same applies to check_order_status: the application prints the orders as
  a formatted list. Never recite order ids, statuses or amounts back. Answer
  only what was asked - "two orders, one still unpaid" - in one short line.
  Order ids are long, so refer to an order by its product name, not its id.

Style and routing examples (placeholders are not catalogue facts):
1. Shopper: "I need a laptop."
   Pluto: "What's your maximum budget?"
2. Shopper: "New, under S$900, 16 GB RAM."
   Pluto: <call product_discovery with those constraints and limit 3>
3. Tool returns three products; the application renders them as cards.
   Pluto: "Three under S$900 with 16 GB. The first is the cheapest in stock."
4. Shopper taps a Buy button.
   Pluto: <the application handles it; no tool call needed>
5. Shopper: "Buy the second one instead."
   Pluto: <call buy_and_pay with that product's exact fields>
6. Shopper: "Where is order abc-123?"
   Pluto: <call check_order_status with order_id "abc-123">
"""

DEFAULT_MODEL = "gpt-5-mini"
MAX_TOOL_ROUNDS = 8

# Telegram has no "new chat" for a DM, so a conversation would otherwise run
# forever: every turn re-sends the whole thread via previous_response_id, making
# each reply slower and dearer than the last. A session ends either when the
# shopper says so (/new) or after this much silence - returning tomorrow should
# not resume yesterday's half-finished shopping.
SESSION_IDLE_TIMEOUT_SECONDS = 30 * 60

_client: AsyncOpenAI | None = None
_previous_response_ids: dict[tuple[int, int], str] = {}
_conversation_locks: dict[tuple[int, int], asyncio.Lock] = {}
# Monotonic timestamp of each conversation's last turn, for the idle timeout.
# Monotonic rather than wall clock so a system clock change cannot expire or
# resurrect a session.
_last_turn_at: dict[tuple[int, int], float] = {}


def reset_conversation(telegram_user_id: int, telegram_chat_id: int) -> bool:
    """Start a fresh thread for this conversation. Returns True if one existed.

    Clears only conversational state. Stored facts and orders live in Supabase
    and deliberately survive, so a new session still knows the shopper.
    """
    conversation_key = (telegram_user_id, telegram_chat_id)
    existed = _previous_response_ids.pop(conversation_key, None) is not None
    _last_turn_at.pop(conversation_key, None)
    _pending_payments.pop(conversation_key, None)
    _pending_cancellations.pop(conversation_key, None)
    _pending_results.pop(conversation_key, None)
    _pending_orders.pop(conversation_key, None)
    return existed


# Orders that have been created but not yet paid for. bot.py drains this after
# each turn to attach the Mini App launch button, which the agent loop cannot
# send itself - it returns text, and a Telegram Web App can only be opened from
# a keyboard button.
_pending_payments: dict[tuple[int, int], dict[str, Any]] = {}


def take_pending_payment(
    telegram_user_id: int, telegram_chat_id: int
) -> dict[str, Any] | None:
    """Pop the payment awaiting a Mini App launch for this conversation."""
    return _pending_payments.pop((telegram_user_id, telegram_chat_id), None)


# Search results awaiting rendering. bot.py draws these as photo cards, so the
# model never has to describe a product list in prose - that is what turns a
# result set into a wall of text.
_pending_results: dict[tuple[int, int], list[dict[str, Any]]] = {}


def take_pending_results(
    telegram_user_id: int, telegram_chat_id: int
) -> list[dict[str, Any]]:
    """Pop the product cards waiting to be rendered for this conversation."""
    return _pending_results.pop((telegram_user_id, telegram_chat_id), [])


# Order lists awaiting rendering, for the same reason as _pending_results: a
# model reciting order ids and amounts produces an unreadable run-on line.
_pending_orders: dict[tuple[int, int], list[dict[str, Any]]] = {}


def take_pending_orders(
    telegram_user_id: int, telegram_chat_id: int
) -> list[dict[str, Any]]:
    """Pop the order list waiting to be rendered for this conversation."""
    return _pending_orders.pop((telegram_user_id, telegram_chat_id), [])


# Cancellations awaiting biometric confirmation. Cancelling is destructive, so
# it is authorised the same way paying is rather than on the model's say-so.
_pending_cancellations: dict[tuple[int, int], dict[str, Any]] = {}


def take_pending_cancellation(
    telegram_user_id: int, telegram_chat_id: int
) -> dict[str, Any] | None:
    """Pop the cancellation awaiting a Mini App confirmation."""
    return _pending_cancellations.pop((telegram_user_id, telegram_chat_id), None)


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        if not os.environ.get("OPENAI_API_KEY"):
            raise RuntimeError(
                "OPENAI_API_KEY is not set. Copy .env.example to .env and fill it in."
            )
        _client = AsyncOpenAI()
    return _client


def _safety_identifier(telegram_user_id: int) -> str:
    """Return a stable pseudonymous identifier for OpenAI safety controls."""
    value = f"pluto-telegram-user:{telegram_user_id}".encode()
    return hashlib.sha256(value).hexdigest()


def _json_result(value: Any) -> str:
    return json.dumps(value, default=str, ensure_ascii=False)


async def _run_tool(
    name: str,
    arguments_json: str,
    *,
    conversation_key: tuple[int, int],
) -> str:
    function = TOOL_DISPATCH.get(name)
    if function is None:
        return _json_result({"ok": False, "error": f"Unknown tool requested: {name}"})

    try:
        arguments = json.loads(arguments_json)
        if not isinstance(arguments, dict):
            raise TypeError("Tool arguments must be a JSON object")

        if name == "buy_and_pay":
            # No in-chat confirmation gate: buy_and_pay only creates a `pending`
            # order and opens the Mini App. Authorisation happens there, with a
            # biometric passkey against a payment preview showing the real
            # amount - the same place the hardcoded demo bot puts it. Nothing
            # here can move money, so the worst a stray call produces is an
            # unpaid row.
            #
            # Identity comes from Telegram, never from the model.
            arguments["telegram_user_id"] = conversation_key[0]
            arguments["telegram_chat_id"] = conversation_key[1]

        # Same rule as buy_and_pay: identity comes from Telegram. For the order
        # tools this is also the ownership check - it scopes every lookup and
        # cancellation to the shopper who sent the message, so knowing an order
        # id is not enough to read or cancel someone else's order.
        if name in ("remember", "check_order_status", "cancel_order"):
            arguments["telegram_user_id"] = conversation_key[0]

        result = await asyncio.to_thread(function, **arguments)

        if name == "buy_and_pay" and isinstance(result, dict):
            _pending_payments[conversation_key] = result

        if (
            name == "cancel_order"
            and isinstance(result, dict)
            and result.get("cancellation_confirmation_required")
        ):
            _pending_cancellations[conversation_key] = result

        if name == "product_discovery" and isinstance(result, list) and result:
            _pending_results[conversation_key] = result

        if name == "check_order_status" and isinstance(result, dict):
            orders = result.get("orders") or []
            if orders:
                _pending_orders[conversation_key] = orders
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        return _json_result(
            {"ok": False, "error": str(exc), "error_type": type(exc).__name__}
        )
    except NotImplementedError as exc:
        return _json_result(
            {"ok": False, "error": str(exc), "error_type": "NotImplementedError"}
        )
    except Exception as exc:  # noqa: BLE001 - tool boundaries must not crash the loop
        # The model needs a useful failure signal, but never a traceback or
        # datastore credentials in its context.
        return _json_result(
            {
                "ok": False,
                "error": "The tool failed unexpectedly. Try again later.",
                "error_type": type(exc).__name__,
            }
        )

    return _json_result({"ok": True, "result": result})


async def _handle_message_locked(
    *, telegram_user_id: int, telegram_chat_id: int, text: str
) -> str:
    client = _get_client()
    conversation_key = (telegram_user_id, telegram_chat_id)
    model = os.environ.get("OPENAI_MODEL", DEFAULT_MODEL)

    # Expire an idle session before doing anything else, so this turn is treated
    # as the start of a new conversation rather than a continuation.
    last_turn = _last_turn_at.get(conversation_key)
    now = time.monotonic()
    if last_turn is not None and now - last_turn > SESSION_IDLE_TIMEOUT_SECONDS:
        logger.info("Session idle for %.0fs; starting a new one.", now - last_turn)
        reset_conversation(telegram_user_id, telegram_chat_id)
    _last_turn_at[conversation_key] = now

    # Only the first turn of a chain needs the memory block: later turns inherit
    # it through previous_response_id, so re-sending would pay for it twice.
    instructions = SYSTEM_PROMPT
    if conversation_key not in _previous_response_ids:
        try:
            instructions += await asyncio.to_thread(
                memory_db.build_context, telegram_user_id
            )
        except Exception:
            # Memory is an enhancement. A shopper with an unreachable memory
            # store should still be able to shop.
            logger.exception("Could not load shopper memory; continuing without it.")

    request: dict[str, Any] = {
        "model": model,
        "instructions": instructions,
        "input": text,
        "tools": ALL_TOOLS,
        "tool_choice": "auto",
        "parallel_tool_calls": False,
        "safety_identifier": _safety_identifier(telegram_user_id),
        "text": {"verbosity": "low"},
    }

    previous_response_id = _previous_response_ids.get(conversation_key)
    if previous_response_id is not None:
        request["previous_response_id"] = previous_response_id

    response = await client.responses.create(**request)

    for _ in range(MAX_TOOL_ROUNDS):
        calls = [item for item in response.output if item.type == "function_call"]
        if not calls:
            _previous_response_ids[conversation_key] = response.id
            reply = response.output_text.strip()
            if reply:
                return reply
            return "I couldn't produce a reply just now. Please try again."

        tool_outputs = []
        for call in calls:
            output = await _run_tool(
                call.name,
                call.arguments,
                conversation_key=conversation_key,
            )
            tool_outputs.append(
                {
                    "type": "function_call_output",
                    "call_id": call.call_id,
                    "output": output,
                }
            )

        response = await client.responses.create(
            model=model,
            # Same instructions as the opening call, so a tool round on the
            # first turn does not drop the shopper's memory block mid-turn.
            instructions=instructions,
            input=tool_outputs,
            tools=ALL_TOOLS,
            tool_choice="auto",
            parallel_tool_calls=False,
            previous_response_id=response.id,
            safety_identifier=_safety_identifier(telegram_user_id),
            text={"verbosity": "low"},
        )

    raise RuntimeError(f"OpenAI tool-calling loop exceeded {MAX_TOOL_ROUNDS} rounds.")


async def handle_message(
    *, telegram_user_id: int, telegram_chat_id: int, text: str
) -> str:
    """Run one shopper turn through OpenAI and return the final text reply.

    Responses are chained in memory by Telegram user/chat, so follow-up
    messages retain conversational context until this process restarts.
    """
    if not text.strip():
        return "What would you like help shopping for?"

    conversation_key = (telegram_user_id, telegram_chat_id)
    lock = _conversation_locks.setdefault(conversation_key, asyncio.Lock())
    async with lock:
        return await _handle_message_locked(
            telegram_user_id=telegram_user_id,
            telegram_chat_id=telegram_chat_id,
            text=text.strip(),
        )
