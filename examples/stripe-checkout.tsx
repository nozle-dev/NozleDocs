import { useState } from 'react';

import { Nozle, type CheckoutStatus } from '@nozle-js/node';
import { BillingProvider, Checkout, CheckoutButton } from '@nozle-js/react';

const nozle = new Nozle({ apiKey: 'sk_example' });

// Merchant backend: create the checkout for the authenticated customer.
// Return the result to the browser. For `type: "stripe"` it carries the
// embedded Checkout Session secret.
export async function createCheckout(customerId: string, planCode: string) {
  return nozle.checkout(
    customerId,
    planCode,
    'https://app.example.com/settings/billing',
    { idempotencyKey: `checkout-${customerId}-${planCode}-v1` },
  );
}

// Merchant backend: a paid upgrade returns `plan_upgrade_intent_id`. Poll it
// until `status` and `fulfillment_status` are both `succeeded`. Stripe needs the
// customer and subscription scope.
export async function upgradeStatus(
  planUpgradeIntentId: string,
  customerId: string,
  subscriptionId: string,
): Promise<CheckoutStatus> {
  return nozle.checkoutStatus(planUpgradeIntentId, { customerId, subscriptionId });
}

// Merchant backend: a new-subscription checkout has no checkout ID. Poll billing
// status until the customer's active plan is the plan they bought.
export async function hasPlan(customerId: string, planCode: string) {
  const response = await fetch(
    `https://api.nozle.app/engine/api/v1/billing/status?customer_id=${encodeURIComponent(customerId)}`,
    { headers: { Authorization: 'Bearer sk_example' } },
  );
  if (!response.ok) return false;
  const status = (await response.json()) as { plan: string };
  return status.plan === planCode;
}

// React: mount the secret with Stripe Embedded Checkout.
export function BillingApp({
  publishableKey,
  stripePublishableKey,
}: {
  publishableKey: string;
  stripePublishableKey: string;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  return (
    <BillingProvider
      publishableKey={publishableKey}
      createCheckout={async ({ planCode, returnUrl, idempotencyKey }) => {
        const response = await fetch('/api/billing/checkout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planCode, returnUrl, idempotencyKey }),
        });
        if (!response.ok) throw new Error('Checkout failed');
        return response.json();
      }}
    >
      {clientSecret ? (
        <Checkout
          clientSecret={clientSecret}
          publishableKey={stripePublishableKey}
          onComplete={() => setClientSecret(null)}
        />
      ) : (
        <CheckoutButton
          planCode="pro_monthly"
          onStripeClientSecret={setClientSecret}
        />
      )}
    </BillingProvider>
  );
}
