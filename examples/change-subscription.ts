import { Nozle, type SubscriptionChangePreview } from '@nozle-js/node';

const nozle = new Nozle({ apiKey: process.env.NOZLE_SECRET_KEY });

const returnUrl = 'https://app.example.com/settings/billing';

// Step 1: the plans this subscription may move to, and the exact price of one move.
export async function previewPlanChange(customerId: string, subscriptionId: string, targetPlanCode: string) {
  const options = await nozle.subscriptionOptions(customerId, subscriptionId);
  if (!options.eligible_plans.some((plan) => plan.code === targetPlanCode)) {
    throw new Error(`${targetPlanCode} is not an eligible plan for ${subscriptionId}`);
  }
  // Show these amounts and dates to the customer before they confirm. The quote lasts five minutes.
  return nozle.previewSubscriptionChange(customerId, subscriptionId, targetPlanCode);
}

// Step 2: apply the confirmed quote. actionKey is stable per confirmation, so a retry replays it.
export async function confirmPlanChange(
  customerId: string,
  subscriptionId: string,
  targetPlanCode: string,
  quote: SubscriptionChangePreview,
  actionKey: string,
) {
  if (quote.transition_direction === 'upgrade') {
    // A paid upgrade goes through checkout; handle the result as in checkout.ts.
    return nozle.checkout(customerId, targetPlanCode, returnUrl, {
      subscriptionId,
      quoteId: quote.quote_id,
      idempotencyKey: actionKey,
    });
  }
  return nozle.applySubscriptionTransition(
    {
      customerId,
      subscriptionId,
      operation: 'downgrade',
      targetPlanCode,
      timing: quote.timing,
      billingAnchor: 'keep_anchor',
      quoteId: quote.quote_id,
    },
    actionKey,
  );
}

// Cancel at the end of the period, after the customer saw the ending date.
export async function cancelAtPeriodEnd(customerId: string, subscriptionId: string, actionKey: string) {
  const preview = await nozle.previewSubscriptionTransition({
    customerId,
    subscriptionId,
    operation: 'cancel',
    timing: 'end_of_period',
  });
  return nozle.applySubscriptionTransition(
    {
      customerId,
      subscriptionId,
      operation: 'cancel',
      timing: 'end_of_period',
      expectedEffectiveAt: preview.subscription_transition.effective_at,
    },
    actionKey,
  );
}

// Undo a scheduled cancellation before it takes effect.
export async function keepSubscription(customerId: string, subscriptionId: string, actionKey: string) {
  return nozle.applySubscriptionTransition({ customerId, subscriptionId, operation: 'uncancel' }, actionKey);
}

// End it now, for example when an admin closes the account.
export async function cancelNow(customerId: string, subscriptionId: string) {
  const { subscription } = await nozle.cancelSubscription(customerId, subscriptionId, { policy: 'immediate' });
  return subscription.status;
}
