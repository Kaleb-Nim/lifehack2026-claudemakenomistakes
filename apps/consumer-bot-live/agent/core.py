"""Agent tool-calling loop — NOT WIRED UP YET.

This is the seam where the OpenAI API gets hooked in. bot.py calls
`handle_message` for every incoming Telegram text message; it's expected to
run an OpenAI tool-calling loop (Chat Completions or Responses API, agent's
choice) against ALL_TOOLS from tool_schemas.py, dispatching to the
implementations in tools/*.py via TOOL_DISPATCH below.

Left as a stub deliberately (per team decision 2026-08-29) so this can be
built independently of the DB clients and bot entrypoint.
"""

from __future__ import annotations

from tools import buy_and_pay, cancel_order, check_order_status, product_discovery

TOOL_DISPATCH = {
    "product_discovery": product_discovery.run,
    "buy_and_pay": buy_and_pay.run,
    "check_order_status": check_order_status.run,
    "cancel_order": cancel_order.run,
}


async def handle_message(
    *, telegram_user_id: int, telegram_chat_id: int, text: str
) -> str:
    """Run the agent loop for one shopper message and return its reply.

    TODO: call the OpenAI API with tool_schemas.ALL_TOOLS, dispatch any
    tool calls through TOOL_DISPATCH, feed results back to the model, and
    return its final text response. See MEMORY (agent/memory.py, not yet
    built) for carrying shopper preferences across turns.
    """
    raise NotImplementedError(
        "agent/core.py: OpenAI tool-calling loop not wired up yet."
    )
