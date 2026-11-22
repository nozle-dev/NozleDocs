from __future__ import annotations

import os
from typing import Any

from nozle import CheckoutResult, Nozle, NozleAPIError

nozle = Nozle(api_key=os.environ["NOZLE_SECRET_KEY"])

ALLOWED_PLANS = {"pro_monthly", "pro_annual"}
RETURN_URL = "https://app.example.com/settings/billing"


def start_checkout(customer_id: str, plan_code: str, action_key: str) -> dict[str, Any]:
    """Start a checkout and tell the browser what to do next."""
    if plan_code not in ALLOWED_PLANS:
        return {"action": "error", "code": "invalid_plan"}
    try:
        result = nozle.checkout(customer_id, plan_code, RETURN_URL, idempotency_key=action_key)
    except NozleAPIError as error:
        if error.status_code == 422 and error.has_code("checkout_not_required"):
            # Free, trial or pay-in-arrears plans need no payment up front.
            nozle.subscribe(customer_id, plan_code)
            return {"action": "done", "plan_code": plan_code}
        return {"action": "error", "code": error.code or "checkout_failed"}
    return to_reply(result)


def to_reply(result: CheckoutResult) -> dict[str, Any]:
    if result["type"] == "hosted":
        # Stripe, or Nozle's auto-pay page. The return to RETURN_URL proves nothing:
        # confirm with the subscription.started webhook or by reloading billing state.
        # A paid upgrade carries plan_upgrade_intent_id: poll it with checkout_settled.
        return {
            "action": "redirect",
            "url": result["url"],
            "plan_upgrade_intent_id": result.get("plan_upgrade_intent_id"),
        }
    if result["type"] == "razorpay":
        return {
            "action": "open_razorpay",
            "key_id": result["key_id"],
            "order_id": result["order_id"],
            "amount_cents": result["amount_cents"],
            "currency": result["currency"],
            "checkout_id": result["checkout_id"],
        }
    if result["type"] == "processing":
        return {"action": "retry_later", "checkout_id": result["checkout_id"]}
    if result["type"] == "completed":
        return {"action": "done", "plan_code": result.get("plan_code")}
    if result["type"] == "scheduled":
        return {
            "action": "scheduled",
            "plan_code": result.get("plan_code"),
            "effective_at": result.get("effective_at"),
        }
    raise ValueError(f"unhandled checkout result: {result!r}")


def checkout_settled(
    checkout_id: str, customer_id: str | None = None, subscription_id: str | None = None
) -> bool:
    """Poll a processing result's checkout_id, or a paid upgrade's plan_upgrade_intent_id.

    A Stripe upgrade needs the customer and subscription scope.
    """
    status = nozle.checkout_status(
        checkout_id, customer_id=customer_id, subscription_id=subscription_id
    )
    return status["status"] == "succeeded" and status["fulfillment_status"] == "succeeded"
