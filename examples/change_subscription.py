from __future__ import annotations

import os
from typing import Any

from nozle import Nozle, SubscriptionChangePreview

nozle = Nozle(api_key=os.environ["NOZLE_SECRET_KEY"])

RETURN_URL = "https://app.example.com/settings/billing"


def preview_plan_change(
    customer_id: str, subscription_id: str, target_plan_code: str
) -> SubscriptionChangePreview:
    """Step 1: the plans this subscription may move to, and the exact price of one move."""
    options = nozle.subscription_options(customer_id, subscription_id)
    if not any(plan["code"] == target_plan_code for plan in options["eligible_plans"]):
        raise ValueError(f"{target_plan_code} is not an eligible plan for {subscription_id}")
    # Show these amounts and dates to the customer before they confirm. The quote lasts five minutes.
    return nozle.preview_subscription_change(customer_id, subscription_id, target_plan_code)


def confirm_plan_change(
    customer_id: str,
    subscription_id: str,
    target_plan_code: str,
    quote: SubscriptionChangePreview,
    action_key: str,
) -> Any:
    """Step 2: apply the confirmed quote. action_key is stable per confirmation, so a retry replays it."""
    if quote["transition_direction"] == "upgrade":
        # A paid upgrade goes through checkout; handle the result as in checkout.py.
        return nozle.checkout(
            customer_id,
            target_plan_code,
            RETURN_URL,
            subscription_id=subscription_id,
            quote_id=quote["quote_id"],
            idempotency_key=action_key,
        )
    return nozle.apply_subscription_transition(
        {
            "customer_id": customer_id,
            "subscription_id": subscription_id,
            "operation": "downgrade",
            "target_plan_code": target_plan_code,
            "timing": quote["timing"],
            "billing_anchor": "keep_anchor",
            "quote_id": quote["quote_id"],
        },
        idempotency_key=action_key,
    )


def cancel_at_period_end(customer_id: str, subscription_id: str, action_key: str) -> Any:
    """Cancel at the end of the period, after the customer saw the ending date."""
    preview = nozle.preview_subscription_transition(
        {
            "customer_id": customer_id,
            "subscription_id": subscription_id,
            "operation": "cancel",
            "timing": "end_of_period",
        }
    )
    return nozle.apply_subscription_transition(
        {
            "customer_id": customer_id,
            "subscription_id": subscription_id,
            "operation": "cancel",
            "timing": "end_of_period",
            "expected_effective_at": preview["subscription_transition"]["effective_at"],
        },
        idempotency_key=action_key,
    )


def keep_subscription(customer_id: str, subscription_id: str, action_key: str) -> Any:
    """Undo a scheduled cancellation before it takes effect."""
    return nozle.apply_subscription_transition(
        {"customer_id": customer_id, "subscription_id": subscription_id, "operation": "uncancel"},
        idempotency_key=action_key,
    )


def cancel_now(customer_id: str, subscription_id: str) -> str:
    """End it now, for example when an admin closes the account."""
    return nozle.cancel_subscription(customer_id, subscription_id, "immediate")["subscription"]["status"]
