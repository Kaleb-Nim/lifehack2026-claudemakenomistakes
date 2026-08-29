"""Tests for deterministic consumer purchase transitions and safeguards."""

from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import patch

from telegram import InlineKeyboardMarkup, ReplyKeyboardRemove

import bot
import content
import flow


def advance_to_use_cases(session: flow.Session) -> None:
    flow.handle_action(session, flow.CATEGORY_LAPTOP)


def select_coursework_and_programming(session: flow.Session) -> None:
    flow.handle_text(
        session,
        "I need a laptop for programming and coursework assignments.",
    )


def advance_to_visa(session: flow.Session) -> None:
    select_coursework_and_programming(session)
    flow.handle_text(session, "buy Lenovo IdeaPad 5a")


def advance_to_order(session: flow.Session) -> None:
    advance_to_visa(session)
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
        self.assertIn("What matters most", result.view.text)
        self.assertEqual(result.view.button_rows[0][0].label, "Back to laptops")

    def test_canonical_budget_text_advances(self) -> None:
        session = flow.Session()

        result = flow.handle_text(session, content.BUDGET_REQUEST)

        self.assertTrue(result.accepted)
        self.assertEqual(session.step, flow.Step.USE_CASES)

    def test_natural_laptop_request_advances(self) -> None:
        session = flow.Session()

        result = flow.handle_text(session, "Can you find me a cheap laptop?")

        self.assertTrue(result.accepted)
        self.assertEqual(session.step, flow.Step.USE_CASES)

    def test_scoped_laptop_request_skips_clarifying_question(self) -> None:
        session = flow.Session()

        result = flow.handle_text(
            session,
            "I need a laptop for university coursework, coding and Docker.",
        )

        self.assertTrue(result.accepted)
        self.assertEqual(session.step, flow.Step.RECOMMENDATION)
        self.assertEqual(
            session.selected_use_cases,
            {"coursework", "programming"},
        )
        self.assertIn("AVAILABLE LAPTOPS", result.view.text)
        self.assertNotIn("ROUGH SPEC RANGE", result.view.text)

    def test_typed_scope_answer_advances_without_continue(self) -> None:
        session = flow.Session(step=flow.Step.USE_CASES)

        result = flow.handle_text(session, "Programming and video editing")

        self.assertTrue(result.accepted)
        self.assertEqual(session.step, flow.Step.RECOMMENDATION)
        self.assertEqual(
            session.selected_use_cases,
            {"programming", "video_editing"},
        )


class UseCaseTests(unittest.TestCase):
    def test_school_request_asks_what_kind_of_schoolwork(self) -> None:
        session = flow.Session()
        advance_to_use_cases(session)

        result = flow.handle_text(session, "It is for school")

        self.assertEqual(session.step, flow.Step.SCHOOLWORK)
        self.assertIn("What kind of schoolwork", result.view.text)
        self.assertNotIn("Essays and research", result.view.text)

    def test_computer_science_schoolwork_produces_specs(self) -> None:
        session = flow.Session(step=flow.Step.SCHOOLWORK)

        result = flow.handle_text(session, "Coding and computer science")

        self.assertEqual(session.step, flow.Step.RECOMMENDATION)
        self.assertEqual(session.selected_use_cases, {"coursework", "programming"})
        self.assertIn("16 GB", result.view.text)


class RecommendationAndCartTests(unittest.TestCase):
    def test_recommendation_contains_required_details(self) -> None:
        session = flow.Session()
        select_coursework_and_programming(session)

        result = flow.TransitionResult(True, flow.current_view(session))

        self.assertEqual(session.step, flow.Step.RECOMMENDATION)
        self.assertIn("Acer Aspire Lite 14", result.view.text)
        self.assertIn("Lenovo IdeaPad 5a 2-in-1", result.view.text)
        self.assertIn("Microsoft Surface Laptop 13", result.view.text)
        self.assertIn("HP ProBook 4 G1i 14", result.view.text)
        self.assertIn("Dell Inspiron 14 2-in-1", result.view.text)
        self.assertIn("S$1,099", result.view.text)
        self.assertIn("16 GB", result.view.text)
        self.assertIn("512 GB", result.view.text)
        self.assertIn("1. Acer Aspire Lite 14", result.view.text)
        self.assertIn("Why #1:", result.view.rich_html or "")
        self.assertEqual((result.view.rich_html or "").count("<figure>"), 5)
        self.assertNotIn("best", result.view.text.casefold())
        self.assertNotIn("recommended", result.view.text.casefold())

    def test_comparison_does_not_change_product_state(self) -> None:
        session = flow.Session()
        select_coursework_and_programming(session)

        result = flow.handle_action(session, flow.COMPARE_OPTIONS)

        self.assertEqual(session.step, flow.Step.RECOMMENDATION)
        self.assertIn("LAPTOP COMPARISON", result.view.text)
        self.assertIn("| Laptop", result.view.text)

    def test_buying_product_goes_directly_to_authentication(self) -> None:
        session = flow.Session()
        select_coursework_and_programming(session)

        result = flow.handle_text(session, "buy the Dell Inspiron 14")

        self.assertFalse(session.include_hub)
        self.assertEqual(session.step, flow.Step.VISA_CONFIRMATION)
        self.assertEqual(session.selected_product_key, "dell-inspiron-14-7440")
        self.assertIn("Dell Inspiron 14 2-in-1", result.view.text)
        self.assertIn("S$1,849", result.view.text)
        self.assertIn("Passkey active", result.view.text)
        self.assertNotIn("hub", result.view.text.casefold())

    def test_product_aliases_customize_checkout(self) -> None:
        cases = (
            ("acer", "Acer Aspire Lite 14"),
            ("Lenovo IdeaPad", "Lenovo IdeaPad 5a 2-in-1"),
            ("Surface", "Microsoft Surface Laptop 13"),
            ("HP ProBook", "HP ProBook 4 G1i 14"),
            ("Dell 7440", "Dell Inspiron 14 2-in-1"),
        )
        for answer, product_name in cases:
            with self.subTest(answer=answer):
                session = flow.Session()
                select_coursework_and_programming(session)

                result = flow.handle_text(session, answer)

                self.assertEqual(session.step, flow.Step.VISA_CONFIRMATION)
                self.assertIn(product_name, result.view.text)
                self.assertEqual(result.view.product_name, product_name)

    def test_cancel_authentication_returns_to_products(self) -> None:
        session = flow.Session()
        advance_to_visa(session)

        result = flow.handle_action(session, flow.CANCEL_CHECKOUT)

        self.assertEqual(session.step, flow.Step.RECOMMENDATION)
        self.assertIn("No payment was made", result.view.text)


class PaymentSafeguardTests(unittest.TestCase):
    def test_free_text_cannot_authorize_payment(self) -> None:
        session = flow.Session()
        advance_to_visa(session)

        result = flow.handle_text(session, "Yes, pay now")

        self.assertFalse(result.accepted)
        self.assertEqual(session.step, flow.Step.VISA_CONFIRMATION)
        self.assertEqual(session.payment_status, flow.PaymentStatus.UNPAID)
        self.assertEqual(session.order_status, flow.OrderStatus.NONE)
        self.assertIn("No payment is made unless", result.view.text)

    def test_cancel_checkout_never_approves_payment(self) -> None:
        session = flow.Session()
        advance_to_visa(session)

        result = flow.handle_action(session, flow.CANCEL_CHECKOUT)

        self.assertEqual(session.step, flow.Step.RECOMMENDATION)
        self.assertEqual(session.payment_status, flow.PaymentStatus.UNPAID)
        self.assertEqual(session.order_status, flow.OrderStatus.NONE)
        self.assertIn("No payment was made", result.view.text)

    def test_only_explicit_passkey_action_approves_payment(self) -> None:
        session = flow.Session()
        advance_to_visa(session)

        result = flow.handle_action(session, flow.CONFIRM_WITH_PASSKEY)

        self.assertEqual(session.step, flow.Step.ORDER_CONFIRMED)
        self.assertEqual(session.payment_status, flow.PaymentStatus.APPROVED)
        self.assertEqual(session.order_status, flow.OrderStatus.PREPARING)
        self.assertIn("Amount:", result.view.text)
        self.assertIn("S$1,310", result.view.text)
        self.assertIn("SG-NOVA-2048", result.view.text)

    def test_stale_action_cannot_change_payment_state(self) -> None:
        session = flow.Session()
        select_coursework_and_programming(session)

        result = flow.handle_action(session, flow.CONFIRM_WITH_PASSKEY)

        self.assertFalse(result.accepted)
        self.assertEqual(session.step, flow.Step.RECOMMENDATION)
        self.assertEqual(session.payment_status, flow.PaymentStatus.UNPAID)
        self.assertIn("confirmation has expired", result.view.text)


class OrderAndCancellationTests(unittest.TestCase):
    def test_tracking_and_receipt_are_deterministic(self) -> None:
        session = flow.Session()
        advance_to_order(session)

        tracking = flow.handle_action(session, flow.TRACK_ORDER)
        receipt = flow.handle_action(session, flow.VIEW_RECEIPT)

        self.assertIn("NE-2048", tracking.view.text)
        self.assertIn("Preparing", tracking.view.text)
        self.assertIn("SG-NOVA-2048", tracking.view.text)
        self.assertIn("Amount paid:", receipt.view.text)
        self.assertIn("S$1,310", receipt.view.text)
        self.assertIn("Lenovo IdeaPad 5a 2-in-1", receipt.view.text)
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
        advance_to_order(session)
        flow.handle_action(session, flow.CANCEL_ORDER)

        result = flow.handle_action(session, flow.CONFIRM_CANCELLATION)

        self.assertEqual(session.step, flow.Step.ORDER_CANCELLED)
        self.assertEqual(session.order_status, flow.OrderStatus.CANCELLED)
        self.assertEqual(
            session.payment_status,
            flow.PaymentStatus.REFUND_INITIATED,
        )
        self.assertIn("Refund:", result.view.text)
        self.assertIn("S$1,310", result.view.text)
        self.assertIn("initiated", result.view.text)
        self.assertIn("RF-8821", result.view.text)
        self.assertIn("reversal, void, or refund", result.view.text)


class ResetAndIsolationTests(unittest.TestCase):
    def test_reset_clears_all_transaction_state(self) -> None:
        session = flow.Session()
        advance_to_order(session)

        flow.reset_session(session)

        self.assertEqual(session.step, flow.Step.DISCOVERY)
        self.assertEqual(session.selected_use_cases, set())
        self.assertEqual(session.selected_product_key, content.DEFAULT_LAPTOP.key)
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
    def test_only_consequential_actions_are_rendered_as_buttons(self) -> None:
        discovery_markup = bot.telegram_markup(flow.current_view(flow.Session()))
        self.assertIsInstance(discovery_markup, ReplyKeyboardRemove)

        payment_session = flow.Session(step=flow.Step.VISA_CONFIRMATION)
        with patch.object(bot, "current_mini_app_url", return_value=""):
            payment_markup = bot.telegram_markup(flow.current_view(payment_session))
        self.assertIsInstance(payment_markup, InlineKeyboardMarkup)
        self.assertEqual(
            [
                button.callback_data
                for row in payment_markup.inline_keyboard
                for button in row
            ],
            [flow.CONFIRM_WITH_PASSKEY],
        )

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
        second.step = flow.Step.CHECKOUT

        replacement = bot.replace_session(chat_data, 101)

        self.assertEqual(replacement.step, flow.Step.DISCOVERY)
        self.assertEqual(bot.get_session(chat_data, 202).step, flow.Step.CHECKOUT)

    async def test_typed_choice_is_accepted_and_gets_a_new_prompt(self) -> None:
        events: list[tuple[str, object]] = []

        class Message:
            text = "laptop"

            async def reply_text(
                self,
                text: str,
                reply_markup: object,
                parse_mode: object,
            ) -> None:
                events.append(("reply", text))

        update = SimpleNamespace(
            effective_user=SimpleNamespace(id=101),
            effective_message=Message(),
        )
        context = SimpleNamespace(chat_data={})

        await bot.on_text(update, context)

        self.assertEqual([event[0] for event in events], ["reply"])
        self.assertIn("What will you mainly use it for", events[0][1])
        self.assertEqual(
            bot.get_session(context.chat_data, 101).step,
            flow.Step.USE_CASES,
        )

    async def test_stale_callback_is_acknowledged_and_cannot_approve(self) -> None:
        events: list[tuple[str, object]] = []

        class Message:
            async def reply_text(
                self,
                text: str,
                reply_markup: object,
                parse_mode: object,
            ) -> None:
                events.append(("reply", text))

        class Query:
            data = flow.CONFIRM_WITH_PASSKEY
            message = Message()

            async def answer(self, text: str | None = None) -> None:
                events.append(("answer", text))

        context = SimpleNamespace(chat_data={})
        session = bot.get_session(context.chat_data, 101)
        session.step = flow.Step.CHECKOUT
        update = SimpleNamespace(
            callback_query=Query(),
            effective_user=SimpleNamespace(id=101),
        )

        await bot.on_callback(update, context)

        self.assertIn("confirmation has expired", events[0][1])
        self.assertIn("confirmation has expired", events[1][1])
        self.assertEqual(session.payment_status, flow.PaymentStatus.UNPAID)
        self.assertEqual(session.order_status, flow.OrderStatus.NONE)


if __name__ == "__main__":
    unittest.main()
