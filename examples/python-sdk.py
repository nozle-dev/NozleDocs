from __future__ import annotations

from typing import Any

from nozle import Nozle, SubscriptionTransitionParams


nozle = Nozle(
    api_key="sk_example",
    base_url="https://api.nozle.app",
    events_url="https://api.nozle.app",
    timeout=10,
)


def exercise_python_sdk() -> None:
    health = nozle.ping()
    print(health["ok"])

    for plan in nozle.plans():
        print(plan["code"], plan["amount_cents"])

    nozle.customers.upsert(
        "workspace_123",
        name="Acme Workspace",
        email="billing@example.com",
    )

    checkout = nozle.checkout(
        "workspace_123",
        "pro_monthly",
        return_url="https://app.example.com/settings/billing",
    )
    if checkout["type"] == "stripe":
        print(checkout.get("url") or checkout.get("client_secret"))

    nozle.subscribe("workspace_123", "free")
    nozle.cancel_subscription("workspace_123", "subscription_123")
    transition: SubscriptionTransitionParams = {
        "customer_id": "workspace_123",
        "subscription_id": "subscription_123",
        "operation": "downgrade",
        "timing": "end_of_period",
        "target_plan_code": "growth_monthly",
        "credit_action": "none",
    }
    nozle.preview_subscription_transition(transition)
    nozle.apply_subscription_transition(
        transition,
        idempotency_key="transition-subscription-123-growth-v1",
    )
    nozle.can("workspace_123", "analytics", {"region": "us-east"})
    nozle.track(
        "workspace_123",
        "api_calls",
        metadata={"tokens": 1_500},
        subscription_id="workspace_123_subscription",
        transaction_id="request_0183f",
        timestamp="2026-08-04T10:30:00Z",
    )

    nozle.entities.get("workspace_123", "user_42")
    nozle.entities.list("workspace_123", status="active", limit=50)
    nozle.entities.upsert(
        "workspace_123",
        "user_42",
        status="active",
        name="Asha",
        metadata={"role": "agent"},
        idempotency_key="entity-user-42-v1",
    )
    nozle.entities.suspend(
        "workspace_123",
        "user_42",
        idempotency_key="suspend-user-42-v1",
    )
    nozle.entities.activate(
        "workspace_123",
        "user_42",
        idempotency_key="activate-user-42-v2",
    )
    nozle.entities.bulk_upsert(
        "workspace_123",
        [
            {"external_id": "user_42", "name": "Asha", "status": "active"},
            {"external_id": "user_43", "name": "Ravi", "status": "suspended"},
        ],
        idempotency_key="workspace-123-users-import-7",
    )

    nozle.entity_subscriptions.ensure("workspace_123", "user_42")
    nozle.entity_subscriptions.get("workspace_123", "user_42")
    nozle.entity_subscriptions.list("workspace_123")
    nozle.entity_subscriptions.checkout(
        "workspace_123",
        "user_42",
        plan_code="pro_monthly",
        billing_time="anniversary",
        return_url="https://app.example.com/settings/billing",
        idempotency_key="checkout-user-42-pro-v1",
    )
    nozle.entity_subscriptions.change_plan(
        "workspace_123",
        "user_42",
        plan_code="max_annual",
        return_url="https://app.example.com/settings/billing",
        idempotency_key="change-user-42-max-v1",
    )
    nozle.entity_subscriptions.cancel(
        "workspace_123",
        "user_42",
        timing="end_of_period",
        idempotency_key="cancel-user-42-v1",
    )

    nozle.credit_systems.list()
    nozle.credits.get_balance("workspace_123", "ai_credits")
    nozle.credits.list_balances("workspace_123")
    nozle.credits.list_operations(
        "workspace_123",
        credit_system_code="ai_credits",
        limit=25,
    )
    nozle.credits.get_entity_balance("workspace_123", "user_42", "ai_credits")
    nozle.credits.list_entity_balances("workspace_123", "user_42")
    nozle.credits.list_entity_operations(
        "workspace_123",
        "user_42",
        credit_system_code="ai_credits",
        limit=25,
    )
    nozle.credits.allocate(
        "workspace_123",
        "user_42",
        credit_system_code="ai_credits",
        amount="100.000000000001",
        idempotency_key="allocate-user-42-100-v1",
    )
    nozle.credits.deallocate(
        "workspace_123",
        "user_42",
        credit_system_code="ai_credits",
        amount="25",
        idempotency_key="deallocate-user-42-25-v1",
    )

    nozle.usage.check(
        "workspace_123",
        "agent_execution",
        entity_id="user_42",
        credit_system_code="ai_credits",
        properties={"model": "example-model"},
    )
    nozle.usage.track(
        "workspace_123",
        "agent_execution",
        entity_id="user_42",
        credit_system_code="ai_credits",
        properties={"model": "example-model"},
        idempotency_key="agent-execution-0183f",
    )

    summary: Any = nozle.margin.summary(from_date="2026-07-01", to_date="2026-07-31")
    trend: Any = nozle.margin.trend(
        granularity="day",
        from_date="2026-07-01",
        to_date="2026-07-31",
    )
    print(summary, trend)


def close_client() -> None:
    nozle.close()
