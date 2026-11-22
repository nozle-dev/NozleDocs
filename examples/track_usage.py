from __future__ import annotations

import os
from datetime import datetime
from typing import Any

from nozle import Nozle

nozle = Nozle(api_key=os.environ["NOZLE_SECRET_KEY"])


def track_generation(
    customer_id: str,
    generation_id: str,
    input_tokens: int,
    output_tokens: int,
    completed_at: datetime,
) -> str:
    """Bill a feature metered from events. Call it after the work succeeded."""
    # The same transaction_id and timestamp on a retry record the event once.
    return nozle.track(
        customer_id,
        "text_generation",
        metadata={"input_tokens": input_tokens, "output_tokens": output_tokens},
        transaction_id=f"generation:{generation_id}:completed",
        timestamp=completed_at.isoformat(),
    )


def charge_agent_step(customer_id: str, step_id: str, started_at: datetime) -> dict[str, Any]:
    """Spend credits for one unit of work: checked and deducted in one call."""
    result = nozle.usage.track(
        customer_id,
        "agent_execution",
        credit_system_code="ai_credits",
        properties={"model": "example-model"},
        timestamp=started_at.isoformat(),
        idempotency_key=f"agent-step:{step_id}",
    )
    if not result["allowed"]:
        return {"charged": False, "reason": result.get("reason"), "available": result.get("available")}
    return {"charged": True, "consumed": result.get("credits_consumed"), "remaining": result.get("remaining")}
