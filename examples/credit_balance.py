from __future__ import annotations

import os
from typing import Any

from nozle import Nozle

nozle = Nozle(api_key=os.environ["NOZLE_SECRET_KEY"])


def show_credits(customer_id: str) -> dict[str, Any]:
    """Amounts are exact decimal strings. Keep them as strings or decimal.Decimal, never floats."""
    balance = nozle.credits.get_balance(customer_id, "ai_credits")
    return {
        "unit": balance["unit_name"],
        "available": balance["available"],  # already excludes credits reserved by open holds
        "held": balance.get("held", "0"),
        "as_of": balance["as_of"],
        "expiring": [
            {"type": source["type"], "remaining": source["remaining"], "expires_at": source["expires_at"]}
            for source in balance["sources"]
            if source["expires_at"] is not None
        ],
    }


def list_all_credits(customer_id: str) -> list[dict[str, str]]:
    balances = nozle.credits.list_balances(customer_id)["balances"]
    return [{"credit_system": b["credit_system"], "available": b["available"]} for b in balances]


def recent_credit_operations(customer_id: str) -> list[Any]:
    page = nozle.credits.list_operations(customer_id, credit_system_code="ai_credits", limit=25)
    return list(page["operations"])
