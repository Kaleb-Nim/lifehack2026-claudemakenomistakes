"""Pure deterministic state transitions for the consumer purchase demo."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

import content


class Step(str, Enum):
    DISCOVERY = "discovery"
    USE_CASES = "use_cases"
    RECOMMENDATION = "recommendation"
    BUNDLE = "bundle"
    CHECKOUT = "checkout"
    VISA_CONFIRMATION = "visa_confirmation"
    ORDER_CONFIRMED = "order_confirmed"
    CANCELLATION_PREVIEW = "cancellation_preview"
    ORDER_CANCELLED = "order_cancelled"


class PaymentStatus(str, Enum):
    UNPAID = "unpaid"
    APPROVED = "approved"
    REFUND_INITIATED = "refund_initiated"


class OrderStatus(str, Enum):
    NONE = "none"
    PREPARING = "preparing"
    CANCELLED = "cancelled"


@dataclass
class Session:
    step: Step = Step.DISCOVERY
    selected_use_cases: set[str] = field(default_factory=set)
    include_hub: bool = False
    payment_status: PaymentStatus = PaymentStatus.UNPAID
    order_status: OrderStatus = OrderStatus.NONE


@dataclass(frozen=True)
class Button:
    label: str
    action: str


@dataclass(frozen=True)
class View:
    text: str
    button_rows: tuple[tuple[Button, ...], ...] = ()


@dataclass(frozen=True)
class TransitionResult:
    accepted: bool
    view: View
    callback_notice: str | None = None


CATEGORY_LAPTOP = "category:laptop"
CATEGORY_PHONE = "category:phone"
CATEGORY_ACCESSORIES = "category:accessories"
BACK_TO_DISCOVERY = "discovery:back"
TOGGLE_COURSEWORK = "use:coursework"
TOGGLE_PROGRAMMING = "use:programming"
TOGGLE_VIDEO_EDITING = "use:video_editing"
CONTINUE_USE_CASES = "use:continue"
COMPARE_OPTIONS = "recommend:compare"
CHOOSE_NOVABOOK = "recommend:choose"
ADD_HUB = "bundle:add_hub"
LAPTOP_ONLY = "bundle:laptop_only"
CUSTOMISE = "bundle:customise"
EDIT_CART = "checkout:edit"
CONTINUE_TO_VISA = "checkout:visa"
CONFIRM_WITH_PASSKEY = "visa:confirm"
CANCEL_CHECKOUT = "visa:cancel"
TRACK_ORDER = "order:track"
CANCEL_ORDER = "order:cancel"
VIEW_RECEIPT = "order:receipt"
KEEP_ORDER = "cancel:keep"
CONFIRM_CANCELLATION = "cancel:confirm"

USE_CASE_ACTIONS = {
    TOGGLE_COURSEWORK: "coursework",
    TOGGLE_PROGRAMMING: "programming",
    TOGGLE_VIDEO_EDITING: "video_editing",
}


def reset_session(session: Session) -> View:
    session.step = Step.DISCOVERY
    session.selected_use_cases.clear()
    session.include_hub = False
    session.payment_status = PaymentStatus.UNPAID
    session.order_status = OrderStatus.NONE
    return current_view(session)


def current_view(session: Session, prefix: str | None = None) -> View:
    if session.step is Step.DISCOVERY:
        return _discovery_view(prefix)
    if session.step is Step.USE_CASES:
        return _use_cases_view(session, prefix)
    if session.step is Step.RECOMMENDATION:
        text = content.recommendation_text(session.selected_use_cases)
        if prefix:
            text = f"{prefix}\n\n{text}"
        return View(text, _recommendation_buttons())
    if session.step is Step.BUNDLE:
        return View(content.bundle_text(prefix), _bundle_buttons())
    if session.step is Step.CHECKOUT:
        return View(
            content.checkout_text(session.include_hub, prefix), _checkout_buttons()
        )
    if session.step is Step.VISA_CONFIRMATION:
        text = content.visa_text(session.include_hub)
        if prefix:
            text = f"{prefix}\n\n{text}"
        return View(text, _visa_buttons())
    if session.step is Step.ORDER_CONFIRMED:
        return View(content.order_text(session.include_hub, prefix), _order_buttons())
    if session.step is Step.CANCELLATION_PREVIEW:
        text = content.cancellation_preview_text(session.include_hub)
        if prefix:
            text = f"{prefix}\n\n{text}"
        return View(text, _cancellation_buttons())
    return View(content.cancellation_complete_text(session.include_hub))


def handle_text(session: Session, text: str) -> TransitionResult:
    if (
        session.step is Step.DISCOVERY
        and text.strip().casefold() == content.BUDGET_REQUEST.casefold()
    ):
        session.step = Step.USE_CASES
        return TransitionResult(True, current_view(session))

    return TransitionResult(False, current_view(session, content.FREE_TEXT_GUIDANCE))


def handle_action(session: Session, action: str) -> TransitionResult:
    if session.step is Step.DISCOVERY:
        return _handle_discovery(session, action)
    if session.step is Step.USE_CASES:
        return _handle_use_cases(session, action)
    if session.step is Step.RECOMMENDATION:
        return _handle_recommendation(session, action)
    if session.step is Step.BUNDLE:
        return _handle_bundle(session, action)
    if session.step is Step.CHECKOUT:
        return _handle_checkout(session, action)
    if session.step is Step.VISA_CONFIRMATION:
        return _handle_visa(session, action)
    if session.step is Step.ORDER_CONFIRMED:
        return _handle_order(session, action)
    if session.step is Step.CANCELLATION_PREVIEW:
        return _handle_cancellation(session, action)
    return _stale_result(session)


def _handle_discovery(session: Session, action: str) -> TransitionResult:
    if action == CATEGORY_LAPTOP:
        session.step = Step.USE_CASES
        return TransitionResult(True, current_view(session))
    if action in {CATEGORY_PHONE, CATEGORY_ACCESSORIES}:
        category = (
            content.UNSUPPORTED_CATEGORY_PHONE
            if action == CATEGORY_PHONE
            else content.UNSUPPORTED_CATEGORY_ACCESSORIES
        )
        return TransitionResult(
            True,
            View(
                content.unsupported_category_text(category),
                ((Button(content.BUTTON_BACK_TO_LAPTOPS, BACK_TO_DISCOVERY),),),
            ),
        )
    if action == BACK_TO_DISCOVERY:
        return TransitionResult(True, current_view(session))
    return _stale_result(session)


def _handle_use_cases(session: Session, action: str) -> TransitionResult:
    if action in USE_CASE_ACTIONS:
        use_case = USE_CASE_ACTIONS[action]
        if use_case in session.selected_use_cases:
            session.selected_use_cases.remove(use_case)
        else:
            session.selected_use_cases.add(use_case)
        return TransitionResult(True, current_view(session))
    if action == CONTINUE_USE_CASES:
        if not session.selected_use_cases:
            notice = content.USE_CASE_REQUIRED_NOTICE
            return TransitionResult(False, current_view(session, notice), notice)
        session.step = Step.RECOMMENDATION
        return TransitionResult(True, current_view(session))
    return _stale_result(session)


def _handle_recommendation(session: Session, action: str) -> TransitionResult:
    if action == COMPARE_OPTIONS:
        return TransitionResult(
            True,
            View(content.comparison_text(), _recommendation_buttons()),
        )
    if action == CHOOSE_NOVABOOK:
        session.step = Step.BUNDLE
        return TransitionResult(True, current_view(session))
    return _stale_result(session)


def _handle_bundle(session: Session, action: str) -> TransitionResult:
    if action == ADD_HUB:
        session.include_hub = True
        session.step = Step.CHECKOUT
        return TransitionResult(True, current_view(session))
    if action == LAPTOP_ONLY:
        session.include_hub = False
        session.step = Step.CHECKOUT
        return TransitionResult(True, current_view(session))
    if action == CUSTOMISE:
        return TransitionResult(
            True,
            View(content.bundle_text(content.customise_text()), _bundle_buttons()),
        )
    return _stale_result(session)


def _handle_checkout(session: Session, action: str) -> TransitionResult:
    if action == EDIT_CART:
        session.step = Step.BUNDLE
        return TransitionResult(True, current_view(session))
    if action == CONTINUE_TO_VISA:
        session.step = Step.VISA_CONFIRMATION
        return TransitionResult(True, current_view(session))
    return _stale_result(session)


def _handle_visa(session: Session, action: str) -> TransitionResult:
    if action == CONFIRM_WITH_PASSKEY:
        session.payment_status = PaymentStatus.APPROVED
        session.order_status = OrderStatus.PREPARING
        session.step = Step.ORDER_CONFIRMED
        return TransitionResult(True, current_view(session))
    if action == CANCEL_CHECKOUT:
        session.step = Step.CHECKOUT
        return TransitionResult(
            True,
            current_view(session, content.CHECKOUT_CANCELLED_NOTICE),
        )
    return _stale_result(session)


def _handle_order(session: Session, action: str) -> TransitionResult:
    if action == TRACK_ORDER:
        return TransitionResult(
            True,
            View(
                content.order_text(session.include_hub, content.tracking_text()),
                _order_buttons(),
            ),
        )
    if action == VIEW_RECEIPT:
        return TransitionResult(
            True,
            View(content.receipt_text(session.include_hub), _order_buttons()),
        )
    if action == CANCEL_ORDER:
        session.step = Step.CANCELLATION_PREVIEW
        return TransitionResult(True, current_view(session))
    return _stale_result(session)


def _handle_cancellation(session: Session, action: str) -> TransitionResult:
    if action == KEEP_ORDER:
        session.step = Step.ORDER_CONFIRMED
        return TransitionResult(
            True,
            current_view(session, content.CANCELLATION_DISMISSED_NOTICE),
        )
    if action == CONFIRM_CANCELLATION:
        session.payment_status = PaymentStatus.REFUND_INITIATED
        session.order_status = OrderStatus.CANCELLED
        session.step = Step.ORDER_CANCELLED
        return TransitionResult(True, current_view(session))
    return _stale_result(session)


def _stale_result(session: Session) -> TransitionResult:
    notice = content.STALE_BUTTON_NOTICE
    return TransitionResult(False, current_view(session, notice), notice)


def _discovery_view(prefix: str | None = None) -> View:
    return View(
        content.discovery_text(prefix),
        (
            (
                Button(content.BUTTON_LAPTOP, CATEGORY_LAPTOP),
                Button(content.BUTTON_PHONE, CATEGORY_PHONE),
                Button(content.BUTTON_ACCESSORIES, CATEGORY_ACCESSORIES),
            ),
        ),
    )


def _use_cases_view(session: Session, prefix: str | None = None) -> View:
    def selectable(label: str, action: str, key: str) -> Button:
        marker = "✓ " if key in session.selected_use_cases else ""
        return Button(f"{marker}{label}", action)

    return View(
        content.use_cases_text(session.selected_use_cases, prefix=prefix),
        (
            (
                selectable(
                    content.BUTTON_COURSEWORK,
                    TOGGLE_COURSEWORK,
                    "coursework",
                ),
                selectable(
                    content.BUTTON_PROGRAMMING,
                    TOGGLE_PROGRAMMING,
                    "programming",
                ),
            ),
            (
                selectable(
                    content.BUTTON_VIDEO_EDITING,
                    TOGGLE_VIDEO_EDITING,
                    "video_editing",
                ),
            ),
            (Button(content.BUTTON_CONTINUE, CONTINUE_USE_CASES),),
        ),
    )


def _recommendation_buttons() -> tuple[tuple[Button, ...], ...]:
    return (
        (
            Button(content.BUTTON_COMPARE, COMPARE_OPTIONS),
            Button(content.BUTTON_CHOOSE_NOVABOOK, CHOOSE_NOVABOOK),
        ),
    )


def _bundle_buttons() -> tuple[tuple[Button, ...], ...]:
    return (
        (
            Button(content.add_hub_button_label(), ADD_HUB),
            Button(content.BUTTON_LAPTOP_ONLY, LAPTOP_ONLY),
        ),
        (Button(content.BUTTON_CUSTOMISE, CUSTOMISE),),
    )


def _checkout_buttons() -> tuple[tuple[Button, ...], ...]:
    return (
        (
            Button(content.BUTTON_EDIT_CART, EDIT_CART),
            Button(content.BUTTON_CONTINUE_TO_VISA, CONTINUE_TO_VISA),
        ),
    )


def _visa_buttons() -> tuple[tuple[Button, ...], ...]:
    return (
        (
            Button(content.BUTTON_CONFIRM_WITH_PASSKEY, CONFIRM_WITH_PASSKEY),
            Button(content.BUTTON_CANCEL_CHECKOUT, CANCEL_CHECKOUT),
        ),
    )


def _order_buttons() -> tuple[tuple[Button, ...], ...]:
    return (
        (
            Button(content.BUTTON_TRACK_ORDER, TRACK_ORDER),
            Button(content.BUTTON_CANCEL_ORDER, CANCEL_ORDER),
        ),
        (Button(content.BUTTON_VIEW_RECEIPT, VIEW_RECEIPT),),
    )


def _cancellation_buttons() -> tuple[tuple[Button, ...], ...]:
    return (
        (
            Button(content.BUTTON_KEEP_ORDER, KEEP_ORDER),
            Button(content.BUTTON_CONFIRM_CANCELLATION, CONFIRM_CANCELLATION),
        ),
    )
