"""Tests for deterministic consumer purchase transitions and safeguards."""

from __future__ import annotations

import unittest
from types import SimpleNamespace

import bot
import content
import flow


def advance_to_use_cases(session: flow.Session) -> None:
    flow.handle_action(session, flow.CATEGORY_LAPTOP)


def select_coursework_and_programming(session: flow.Session) -> None:
    advance_to_use_cases(session)
    flow.handle_action(session, flow.TOGGLE_COURSEWORK)
    flow.handle_action(session, flow.TOGGLE_PROGRAMMING)


def advance_to_bundle(session: flow.Session) -> None:
    select_coursework_and_programming(session)
    flow.handle_action(session, flow.CONTINUE_USE_CASES)
    flow.handle_action(session, flow.CHOOSE_NOVABOOK)


def advance_to_visa(session: flow.Session, *, include_hub: bool) -> None:
    advance_to_bundle(session)
    choice = flow.ADD_HUB if include_hub else flow.LAPTOP_ONLY
    flow.handle_action(session, choice)
    flow.handle_action(session, flow.CONTINUE_TO_VISA)


def advance_to_order(session: flow.Session, *, include_hub: bool = True) -> None:
    advance_to_visa(session, include_hub=include_hub)
    flow.handle_action(session, flow.CONFIRM_WITH_PASSKEY)


class DiscoveryTests(unittest.TestCase):
    def test_starting_view_has_all_categories(self) -> None:
        session = flow.Session()

        labels = [
            button.label
            for row in flow.current_view(session).button_rows
            for button in row
        ]

        self.assertEqual(labels, ["Laptop", "Phone", "Accessories"])

    def test_non_demo_category_stays_in_discovery(self) -> None:
        session = flow.Session()

        result = flow.handle_action(session, flow.CATEGORY_PHONE)

        self.assertTrue(result.accepted)
        self.assertEqual(session.step, flow.Step.DISCOVERY)
        self.assertIn("supports laptops", result.view.text)
        self.assertEqual(result.view.button_rows[0][0].label, "Back to laptops")

    def test_canonical_budget_text_advances(self) -> None:
        session = flow.Session()

        result = flow.handle_text(session, content.BUDGET_REQUEST)

        self.assertTrue(result.accepted)
        self.assertEqual(session.step, flow.Step.USE_CASES)


class UseCaseTests(unittest.TestCase):
    def test_multiple_use_cases_toggle_visually(self) -> None:
        session = flow.Session()
        advance_to_use_cases(session)

        flow.handle_action(session, flow.TOGGLE_COURSEWORK)
        result = flow.handle_action(session, flow.TOGGLE_PROGRAMMING)

        self.assertEqual(
            session.selected_use_cases,
            {"coursework", "programming"},
        )
        labels = [button.label for row in result.view.button_rows for button in row]
        self.assertIn("✓ Coursework", labels)
        self.assertIn("✓ Programming", labels)

    def test_selecting_again_deselects(self) -> None:
        session = flow.Session()
        advance_to_use_cases(session)
        flow.handle_action(session, flow.TOGGLE_COURSEWORK)

        flow.handle_action(session, flow.TOGGLE_COURSEWORK)

        self.assertEqual(session.selected_use_cases, set())

    def test_continue_requires_a_selection(self) -> None:
        session = flow.Session()
        advance_to_use_cases(session)

        result = flow.handle_action(session, flow.CONTINUE_USE_CASES)

        self.assertFalse(result.accepted)
        self.assertEqual(session.step, flow.Step.USE_CASES)
        self.assertIn("at least one", result.view.text)


class RecommendationAndCartTests(unittest.TestCase):
    def test_recommendation_contains_required_details(self) -> None:
        session = flow.Session()
        select_coursework_and_programming(session)

        result = flow.handle_action(session, flow.CONTINUE_USE_CASES)

        self.assertEqual(session.step, flow.Step.RECOMMENDATION)
        self.assertIn("NovaBook Pro 14 — S$899", result.view.text)
        self.assertIn("16 GB RAM · 512 GB SSD", result.view.text)
        self.assertIn("VS Code, Docker, and light Premiere Pro", result.view.text)

    def test_comparison_does_not_change_product_state(self) -> None:
        session = flow.Session()
        select_coursework_and_programming(session)
        flow.handle_action(session, flow.CONTINUE_USE_CASES)

        result = flow.handle_action(session, flow.COMPARE_OPTIONS)

        self.assertEqual(session.step, flow.Step.RECOMMENDATION)
        self.assertIn("Three hardcoded demo options", result.view.text)

    def test_customise_returns_to_bundle_choices(self) -> None:
        session = flow.Session()
        advance_to_bundle(session)

        result = flow.handle_action(session, flow.CUSTOMISE)

        self.assertEqual(session.step, flow.Step.BUNDLE)
        self.assertIn("Customisation is hardcoded", result.view.text)
        self.assertTrue(result.view.button_rows)

    def test_hub_checkout_total_is_929(self) -> None:
        session = flow.Session()
        advance_to_bundle(session)

        result = flow.handle_action(session, flow.ADD_HUB)

        self.assertTrue(session.include_hub)
        self.assertEqual(session.step, flow.Step.CHECKOUT)
        self.assertIn("TOTAL: S$929", result.view.text)
        self.assertIn("NO PAYMENT HAS BEEN MADE.", result.view.text)

    def test_laptop_only_checkout_total_is_899(self) -> None:
        session = flow.Session()
        advance_to_bundle(session)

        result = flow.handle_action(session, flow.LAPTOP_ONLY)

        self.assertFalse(session.include_hub)
        self.assertIn("TOTAL: S$899", result.view.text)

    def test_edit_cart_returns_to_bundle(self) -> None:
        session = flow.Session()
        advance_to_bundle(session)
        flow.handle_action(session, flow.ADD_HUB)

        flow.handle_action(session, flow.EDIT_CART)

        self.assertEqual(session.step, flow.Step.BUNDLE)


class PaymentSafeguardTests(unittest.TestCase):
    def test_free_text_cannot_authorize_payment(self) -> None:
        session = flow.Session()
        advance_to_visa(session, include_hub=True)

        result = flow.handle_text(session, "Yes, pay now")

        self.assertFalse(result.accepted)
        self.assertEqual(session.step, flow.Step.VISA_CONFIRMATION)
        self.assertEqual(session.payment_status, flow.PaymentStatus.UNPAID)
        self.assertEqual(session.order_status, flow.OrderStatus.NONE)
        self.assertIn("Free text cannot authorize", result.view.text)

    def test_cancel_checkout_never_approves_payment(self) -> None:
        session = flow.Session()
        advance_to_visa(session, include_hub=True)

        result = flow.handle_action(session, flow.CANCEL_CHECKOUT)

        self.assertEqual(session.step, flow.Step.CHECKOUT)
        self.assertEqual(session.payment_status, flow.PaymentStatus.UNPAID)
        self.assertEqual(session.order_status, flow.OrderStatus.NONE)
        self.assertIn("No payment was made", result.view.text)

    def test_only_explicit_passkey_action_approves_payment(self) -> None:
        session = flow.Session()
        advance_to_visa(session, include_hub=True)

        result = flow.handle_action(session, flow.CONFIRM_WITH_PASSKEY)

        self.assertEqual(session.step, flow.Step.ORDER_CONFIRMED)
        self.assertEqual(session.payment_status, flow.PaymentStatus.APPROVED)
        self.assertEqual(session.order_status, flow.OrderStatus.PREPARING)
        self.assertIn("Amount: S$929", result.view.text)

    def test_stale_action_cannot_change_payment_state(self) -> None:
        session = flow.Session()
        advance_to_bundle(session)

        result = flow.handle_action(session, flow.CONFIRM_WITH_PASSKEY)

        self.assertFalse(result.accepted)
        self.assertEqual(session.step, flow.Step.BUNDLE)
        self.assertEqual(session.payment_status, flow.PaymentStatus.UNPAID)
        self.assertIn("no longer active", result.view.text)


class OrderAndCancellationTests(unittest.TestCase):
    def test_tracking_and_receipt_are_deterministic(self) -> None:
        session = flow.Session()
        advance_to_order(session)

        tracking = flow.handle_action(session, flow.TRACK_ORDER)
        receipt = flow.handle_action(session, flow.VIEW_RECEIPT)

        self.assertIn("NE-2048 is currently Preparing", tracking.view.text)
        self.assertIn("Amount paid: S$929", receipt.view.text)
        self.assertIn("Visa ···· 4242", receipt.view.text)
        self.assertEqual(session.order_status, flow.OrderStatus.PREPARING)

    def test_cancellation_preview_does_not_cancel(self) -> None:
        session = flow.Session()
        advance_to_order(session)

        result = flow.handle_action(session, flow.CANCEL_ORDER)

        self.assertEqual(session.step, flow.Step.CANCELLATION_PREVIEW)
        self.assertEqual(session.order_status, flow.OrderStatus.PREPARING)
        self.assertEqual(session.payment_status, flow.PaymentStatus.APPROVED)
        self.assertIn("No cancellation has happened yet", result.view.text)

    def test_free_text_cannot_confirm_cancellation(self) -> None:
        session = flow.Session()
        advance_to_order(session)
        flow.handle_action(session, flow.CANCEL_ORDER)

        flow.handle_text(session, "Confirm cancellation")

        self.assertEqual(session.step, flow.Step.CANCELLATION_PREVIEW)
        self.assertEqual(session.order_status, flow.OrderStatus.PREPARING)
        self.assertEqual(session.payment_status, flow.PaymentStatus.APPROVED)

    def test_keep_order_preserves_approved_order(self) -> None:
        session = flow.Session()
        advance_to_order(session)
        flow.handle_action(session, flow.CANCEL_ORDER)

        result = flow.handle_action(session, flow.KEEP_ORDER)

        self.assertEqual(session.step, flow.Step.ORDER_CONFIRMED)
        self.assertEqual(session.order_status, flow.OrderStatus.PREPARING)
        self.assertEqual(session.payment_status, flow.PaymentStatus.APPROVED)
        self.assertIn("order is unchanged", result.view.text)

    def test_explicit_cancellation_changes_state_and_refund(self) -> None:
        session = flow.Session()
        advance_to_order(session, include_hub=False)
        flow.handle_action(session, flow.CANCEL_ORDER)

        result = flow.handle_action(session, flow.CONFIRM_CANCELLATION)

        self.assertEqual(session.step, flow.Step.ORDER_CANCELLED)
        self.assertEqual(session.order_status, flow.OrderStatus.CANCELLED)
        self.assertEqual(
            session.payment_status,
            flow.PaymentStatus.REFUND_INITIATED,
        )
        self.assertIn("Refund: S$899 initiated", result.view.text)
        self.assertIn("RF-8821", result.view.text)
        self.assertIn("reversal, void, or refund", result.view.text)


class ResetAndIsolationTests(unittest.TestCase):
    def test_reset_clears_all_transaction_state(self) -> None:
        session = flow.Session()
        advance_to_order(session)

        flow.reset_session(session)

        self.assertEqual(session.step, flow.Step.DISCOVERY)
        self.assertEqual(session.selected_use_cases, set())
        self.assertFalse(session.include_hub)
        self.assertEqual(session.payment_status, flow.PaymentStatus.UNPAID)
        self.assertEqual(session.order_status, flow.OrderStatus.NONE)

    def test_sessions_are_independent(self) -> None:
        first = flow.Session()
        second = flow.Session()

        advance_to_order(first)

        self.assertEqual(first.step, flow.Step.ORDER_CONFIRMED)
        self.assertEqual(second.step, flow.Step.DISCOVERY)
        self.assertEqual(second.payment_status, flow.PaymentStatus.UNPAID)


class TelegramAdapterTests(unittest.IsolatedAsyncioTestCase):
    def test_session_store_is_independent_by_chat_and_user(self) -> None:
        first_chat: dict[object, object] = {}
        second_chat: dict[object, object] = {}

        first_user = bot.get_session(first_chat, 101)
        second_user = bot.get_session(first_chat, 202)
        same_user_other_chat = bot.get_session(second_chat, 101)
        first_user.step = flow.Step.ORDER_CONFIRMED

        self.assertEqual(second_user.step, flow.Step.DISCOVERY)
        self.assertEqual(same_user_other_chat.step, flow.Step.DISCOVERY)
        self.assertIs(first_user, bot.get_session(first_chat, 101))

    def test_replace_session_resets_only_target_user(self) -> None:
        chat_data: dict[object, object] = {}
        first = bot.get_session(chat_data, 101)
        second = bot.get_session(chat_data, 202)
        first.step = flow.Step.ORDER_CONFIRMED
        second.step = flow.Step.BUNDLE

        replacement = bot.replace_session(chat_data, 101)

        self.assertEqual(replacement.step, flow.Step.DISCOVERY)
        self.assertEqual(bot.get_session(chat_data, 202).step, flow.Step.BUNDLE)

    async def test_callback_is_acknowledged_before_message_edit(self) -> None:
        events: list[tuple[str, object]] = []

        class Query:
            data = flow.CATEGORY_LAPTOP
            message = None

            async def answer(self, text: str | None = None) -> None:
                events.append(("answer", text))

            async def edit_message_text(self, text: str, reply_markup: object) -> None:
                events.append(("edit", text))

        update = SimpleNamespace(
            callback_query=Query(),
            effective_user=SimpleNamespace(id=101),
        )
        context = SimpleNamespace(chat_data={})

        await bot.on_callback(update, context)

        self.assertEqual([event[0] for event in events], ["answer", "edit"])
        self.assertIn(content.BUDGET_REQUEST, events[1][1])
        self.assertEqual(
            bot.get_session(context.chat_data, 101).step,
            flow.Step.USE_CASES,
        )

    async def test_stale_callback_is_acknowledged_and_cannot_approve(self) -> None:
        events: list[tuple[str, object]] = []

        class Query:
            data = flow.CONFIRM_WITH_PASSKEY
            message = None

            async def answer(self, text: str | None = None) -> None:
                events.append(("answer", text))

            async def edit_message_text(self, text: str, reply_markup: object) -> None:
                events.append(("edit", text))

        context = SimpleNamespace(chat_data={})
        session = bot.get_session(context.chat_data, 101)
        session.step = flow.Step.BUNDLE
        update = SimpleNamespace(
            callback_query=Query(),
            effective_user=SimpleNamespace(id=101),
        )

        await bot.on_callback(update, context)

        self.assertIn("no longer active", events[0][1])
        self.assertIn("no longer active", events[1][1])
        self.assertEqual(session.payment_status, flow.PaymentStatus.UNPAID)
        self.assertEqual(session.order_status, flow.OrderStatus.NONE)


if __name__ == "__main__":
    unittest.main()
