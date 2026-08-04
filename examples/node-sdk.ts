import { Nozle } from '@nozle-js/node';

const nozle = new Nozle({
  apiKey: 'sk_example',
  baseUrl: 'https://api.nozle.app',
  eventsUrl: 'https://core.nozle.app',
  timeout: 10_000,
});

export async function exerciseNodeSdk() {
  await nozle.ping();
  await nozle.plans();
  await nozle.customers.upsert({
    externalId: 'workspace_123',
    name: 'Acme Workspace',
    email: 'billing@example.com',
  });

  const checkout = await nozle.checkout(
    'workspace_123',
    'pro_monthly',
    'https://app.example.com/settings/billing',
  );
  if (checkout.type === 'stripe') checkout.url;

  await nozle.subscribe('workspace_123', 'free');
  await nozle.cancelSubscription('workspace_123', 'subscription_123');
  const transition = {
    customerId: 'workspace_123',
    subscriptionId: 'subscription_123',
    operation: 'downgrade' as const,
    timing: 'end_of_period' as const,
    targetPlanCode: 'growth_monthly',
    creditAction: 'none' as const,
  };
  await nozle.previewSubscriptionTransition(transition);
  await nozle.applySubscriptionTransition(
    transition,
    'transition-subscription-123-growth-v1',
  );
  await nozle.can('workspace_123', 'analytics', { region: 'us-east' });
  await nozle.track(
    'workspace_123',
    'api_calls',
    { tokens: 1_500 },
    {
      subscriptionId: 'workspace_123_subscription',
      transactionId: 'request_0183f',
      timestamp: new Date().toISOString(),
    },
  );

  await nozle.entities.get('workspace_123', 'user_42');
  await nozle.entities.list('workspace_123', { status: 'active', limit: 50 });
  await nozle.entities.upsert(
    'workspace_123',
    'user_42',
    { name: 'Asha', status: 'active', metadata: { role: 'agent' } },
    { idempotencyKey: 'entity-user-42-v1' },
  );
  await nozle.entities.suspend('workspace_123', 'user_42', {
    idempotencyKey: 'suspend-user-42-v1',
  });
  await nozle.entities.activate('workspace_123', 'user_42', {
    idempotencyKey: 'activate-user-42-v2',
  });
  await nozle.entities.bulkUpsert(
    'workspace_123',
    [
      { externalId: 'user_42', name: 'Asha', status: 'active' },
      { externalId: 'user_43', name: 'Ravi', status: 'suspended' },
    ],
    { idempotencyKey: 'workspace-123-users-import-7' },
  );

  await nozle.entitySubscriptions.ensure('workspace_123', 'user_42');
  await nozle.entitySubscriptions.get('workspace_123', 'user_42');
  await nozle.entitySubscriptions.list('workspace_123');
  await nozle.entitySubscriptions.checkout('workspace_123', 'user_42', {
    planCode: 'pro_monthly',
    billingTime: 'anniversary',
    returnUrl: 'https://app.example.com/settings/billing',
    idempotencyKey: 'checkout-user-42-pro-v1',
  });
  await nozle.entitySubscriptions.changePlan('workspace_123', 'user_42', {
    planCode: 'max_annual',
    returnUrl: 'https://app.example.com/settings/billing',
    idempotencyKey: 'change-user-42-max-v1',
  });
  await nozle.entitySubscriptions.cancel('workspace_123', 'user_42', {
    timing: 'end_of_period',
    idempotencyKey: 'cancel-user-42-v1',
  });

  await nozle.creditSystems.list();
  await nozle.credits.getBalance('workspace_123', 'ai_credits');
  await nozle.credits.listBalances('workspace_123');
  await nozle.credits.listOperations('workspace_123', {
    creditSystemCode: 'ai_credits',
    limit: 25,
  });
  await nozle.credits.getEntityBalance('workspace_123', 'user_42', 'ai_credits');
  await nozle.credits.listEntityBalances('workspace_123', 'user_42');
  await nozle.credits.listEntityOperations('workspace_123', 'user_42', {
    creditSystemCode: 'ai_credits',
    limit: 25,
  });
  await nozle.credits.allocate(
    'workspace_123',
    'user_42',
    { creditSystemCode: 'ai_credits', amount: '100.000000000001' },
    { idempotencyKey: 'allocate-user-42-100-v1' },
  );
  await nozle.credits.deallocate(
    'workspace_123',
    'user_42',
    { creditSystemCode: 'ai_credits', amount: '25' },
    { idempotencyKey: 'deallocate-user-42-25-v1' },
  );

  await nozle.usage.check({
    customerId: 'workspace_123',
    entityId: 'user_42',
    billableMetricCode: 'agent_execution',
    creditSystemCode: 'ai_credits',
    properties: { model: 'example-model' },
  });
  await nozle.usage.track(
    {
      customerId: 'workspace_123',
      entityId: 'user_42',
      billableMetricCode: 'agent_execution',
      creditSystemCode: 'ai_credits',
      properties: { model: 'example-model' },
    },
    { idempotencyKey: 'agent-execution-0183f' },
  );

  await nozle.margin.summary({ from: '2026-07-01', to: '2026-07-31' });
  await nozle.margin.trend({
    from: '2026-07-01',
    to: '2026-07-31',
    granularity: 'day',
  });
}
