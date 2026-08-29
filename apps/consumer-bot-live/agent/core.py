"""OpenAI Responses API loop for the Pluto shopper agent."""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import re
from collections.abc import Callable
from typing import Any

from openai import AsyncOpenAI

from agent.tool_schemas import ALL_TOOLS
from tools import buy_and_pay, cancel_order, check_order_status, product_discovery

TOOL_DISPATCH: dict[str, Callable[..., Any]] = {
    "product_discovery": product_discovery.run,
    "buy_and_pay": buy_and_pay.run,
    "check_order_status": check_order_status.run,
    "cancel_order": cancel_order.run,
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
- Once the shopper chooses a product, call buy_and_pay with the exact tool
  result fields. The application will return ConfirmationRequired. Ask the
  shopper to confirm the named product and exact price, then stop. Do not call
  buy_and_pay again in that turn. After the shopper explicitly confirms in a
  new message, immediately call buy_and_pay again with the identical payload.
- Use check_order_status and cancel_order for order requests; do not guess.
- If a tool returns an error or says it is unavailable, explain that plainly
  and briefly offer to retry. Do not claim the action succeeded or invent
  substitute shopping advice. If product_discovery is unavailable, never say
  you can search manually; Pluto has no other source of live catalogue data.
- Amounts are integer cents and default to SGD unless a tool says otherwise.
- Do not greet after the first message, narrate reasoning, repeat the shopper's
  request, add generic reassurance, or end with "anything else?"
- Normal replies are at most two short sentences or 60 words. Product results
  may contain at most three compact options. Do not use Markdown tables.

Style and routing examples (placeholders are not catalogue facts):
1. Shopper: "I need a laptop."
   Pluto: "What's your maximum budget?"
2. Shopper: "New, under S$900, 16 GB RAM."
   Pluto: <call product_discovery with those constraints and limit 3>
3. Tool returns three products.
   Pluto: <show three numbered one-line options, then ask one decision question>
4. Shopper: "I'll take option 1."
   Pluto: <call buy_and_pay with option 1's exact fields>
5. Tool returns ConfirmationRequired for Product A at S$849.
   Pluto: "Confirm Product A for S$849? Reply ‘Confirm purchase’ to proceed."
6. Shopper: "Confirm purchase."
   Pluto: <call buy_and_pay again with the identical fields>
7. Shopper: "Where is order abc-123?"
   Pluto: <call check_order_status with order_id "abc-123">
"""

DEFAULT_MODEL = "gpt-5-mini"
MAX_TOOL_ROUNDS = 8

_client: AsyncOpenAI | None = None
_previous_response_ids: dict[tuple[int, int], str] = {}
_conversation_locks: dict[tuple[int, int], asyncio.Lock] = {}
_pending_purchases: dict[tuple[int, int], dict[str, Any]] = {}

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


def _is_explicit_purchase_confirmation(text: str) -> bool:
    normalized = re.sub(r"[^a-z0-9]+", " ", text.casefold()).strip()
    confirmations = {
        "yes",
        "yes please",
        "confirm",
        "confirm purchase",
        "confirm payment",
        "buy it",
        "purchase it",
        "pay now",
        "proceed",
        "go ahead",
    }
    return normalized in confirmations


def _purchase_payload(arguments: dict[str, Any]) -> dict[str, Any]:
    return {
        "merchant_name": arguments.get("merchant_name"),
        "product_name": arguments.get("product_name"),
        "product_ref": arguments.get("product_ref"),
        "amount_cents": arguments.get("amount_cents"),
    }


async def _run_tool(
    name: str,
    arguments_json: str,
    *,
    conversation_key: tuple[int, int],
    purchase_authorization: list[dict[str, Any] | None],
) -> str:
    function = TOOL_DISPATCH.get(name)
    if function is None:
        return _json_result({"ok": False, "error": f"Unknown tool requested: {name}"})

    try:
        arguments = json.loads(arguments_json)
        if not isinstance(arguments, dict):
            raise TypeError("Tool arguments must be a JSON object")

        if name == "buy_and_pay":
            purchase = _purchase_payload(arguments)
            if purchase != purchase_authorization[0]:
                _pending_purchases[conversation_key] = purchase
                return _json_result(
                    {
                        "ok": False,
                        "error_type": "ConfirmationRequired",
                        "error": (
                            "Do not call buy_and_pay again in this turn. Ask the "
                            "shopper to confirm this exact purchase, then stop."
                        ),
                        "purchase": purchase,
                    }
                )
            # Consume the authorization before the side effect so a repeated
            # model call cannot create a duplicate purchase.
            purchase_authorization[0] = None
            # Identity comes from Telegram, never from the model.
            arguments["telegram_user_id"] = conversation_key[0]
            arguments["telegram_chat_id"] = conversation_key[1]

        result = await asyncio.to_thread(function, **arguments)

        if name == "buy_and_pay" and isinstance(result, dict):
            _pending_payments[conversation_key] = result
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

    request: dict[str, Any] = {
        "model": model,
        "instructions": SYSTEM_PROMPT,
        "input": text,
        "tools": ALL_TOOLS,
        "tool_choice": "auto",
        "parallel_tool_calls": False,
        "safety_identifier": _safety_identifier(telegram_user_id),
        "text": {"verbosity": "low"},
    }

    pending_purchase = _pending_purchases.pop(conversation_key, None)
    purchase_authorization = [
        pending_purchase if _is_explicit_purchase_confirmation(text) else None
    ]
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
                purchase_authorization=purchase_authorization,
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
            instructions=SYSTEM_PROMPT,
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
