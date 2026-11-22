from __future__ import annotations

import logging
import os
from typing import Any

from nozle import Nozle

nozle = Nozle(api_key=os.environ["NOZLE_SECRET_KEY"])


def handle_analytics_request(customer_id: str) -> tuple[dict[str, Any], int]:
    """Gate a request on the customer's plan. customer_id comes from your session, never from the browser."""
    check = nozle.can(customer_id, "analytics")

    if not check["allowed"]:
        return {
            "error": check.get("reason", "upgrade_required"),
            "used": check["used"],
            "limit": check.get("limit"),
            "remaining": check.get("remaining"),
        }, 403

    # overage never denies by itself: a soft limit is reached and the usage is billed as overage.
    if check.get("overage"):
        logging.warning("%s is past the analytics limit and billed as overage", customer_id)

    return run_analytics_query(customer_id), 200


def can_use_seat(customer_id: str, subscription_id: str) -> bool:
    """A customer with several subscriptions names the one to check."""
    return nozle.can(customer_id, "seats", subscription_id=subscription_id)["allowed"]


def run_analytics_query(customer_id: str) -> dict[str, Any]:
    return {"customer_id": customer_id, "rows": []}
