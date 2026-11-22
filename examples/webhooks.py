from __future__ import annotations

import os
from collections.abc import Mapping
from typing import Any

from nozle import Nozle, NozleWebhookEvent, WebhookVerificationError

nozle = Nozle(api_key=os.environ["NOZLE_SECRET_KEY"])

# The endpoint's whsec_ secret. Pass [new_secret, old_secret] while you rotate it.
WEBHOOK_SECRET = os.environ["NOZLE_WEBHOOK_SECRET"]

handled: set[str] = set()  # Use your database: Nozle retries a delivery until it gets a 2xx.


def handle_webhook(raw_body: bytes, headers: Mapping[str, Any]) -> tuple[dict[str, Any], int]:
    """Verify the raw body before parsing it. Flask: request.get_data(), request.headers."""
    try:
        event = nozle.webhooks.verify(raw_body, headers, webhook_secret=WEBHOOK_SECRET)
    except WebhookVerificationError as error:
        return {"code": error.code}, 400
    on_event(event)  # An exception here answers 500, so Nozle delivers it again.
    return {"received": True}, 200


def on_event(event: NozleWebhookEvent) -> None:
    if event.id in handled:
        return
    if event.type == "subscription.started":
        grant_access(event.object)
    elif event.type == "subscription.terminated":
        revoke_access(event.object)
    elif event.type == "invoice.payment_status_updated":
        record_payment(event.object)
    # Other event types: acknowledge and ignore.
    handled.add(event.id)


def grant_access(subscription: dict[str, Any]) -> None:
    print("grant", subscription.get("external_id"))


def revoke_access(subscription: dict[str, Any]) -> None:
    print("revoke", subscription.get("external_id"))


def record_payment(invoice: dict[str, Any]) -> None:
    print("invoice", invoice.get("nozle_id"), invoice.get("payment_status"))
