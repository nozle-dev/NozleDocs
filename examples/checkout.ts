import { Nozle, NozleApiError, type CheckoutResult } from '@nozle-js/node';

const nozle = new Nozle({ apiKey: process.env.NOZLE_SECRET_KEY });

const allowedPlans = new Set(['pro_monthly', 'pro_annual']);
const returnUrl = 'https://app.example.com/settings/billing';

// What your backend sends back to the browser.
type CheckoutReply =
  | { action: 'redirect'; url: string; planUpgradeIntentId?: string }
  | { action: 'open_razorpay'; keyId: string; orderId: string; amountCents: number; currency: string; checkoutId: string }
  | { action: 'retry_later'; checkoutId: string }
  | { action: 'done'; planCode?: string }
  | { action: 'scheduled'; planCode?: string; effectiveAt?: string }
  | { action: 'error'; code: string };

export async function startCheckout(customerId: string, planCode: string, actionKey: string): Promise<CheckoutReply> {
  if (!allowedPlans.has(planCode)) return { action: 'error', code: 'invalid_plan' };
  try {
    const result = await nozle.checkout(customerId, planCode, returnUrl, { idempotencyKey: actionKey });
    return toReply(result);
  } catch (error) {
    if (error instanceof NozleApiError && error.status === 422 && error.hasCode('checkout_not_required')) {
      // Free, trial or pay-in-arrears plans need no payment up front.
      await nozle.subscribe(customerId, planCode);
      return { action: 'done', planCode };
    }
    if (error instanceof NozleApiError) return { action: 'error', code: error.code ?? 'checkout_failed' };
    throw error;
  }
}

function toReply(result: CheckoutResult): CheckoutReply {
  switch (result.type) {
    case 'hosted':
      // Stripe, or Nozle's auto-pay page. The return to returnUrl proves nothing:
      // confirm with the subscription.started webhook or by reloading billing state.
      // A paid upgrade carries planUpgradeIntentId: poll it with checkoutSettled.
      return { action: 'redirect', url: result.url, planUpgradeIntentId: result.plan_upgrade_intent_id };
    case 'razorpay':
      return {
        action: 'open_razorpay',
        keyId: result.key_id,
        orderId: result.order_id,
        amountCents: result.amount_cents,
        currency: result.currency,
        checkoutId: result.checkout_id,
      };
    case 'processing':
      return { action: 'retry_later', checkoutId: result.checkout_id };
    case 'completed':
      return { action: 'done', planCode: result.plan_code };
    case 'scheduled':
      return { action: 'scheduled', planCode: result.plan_code, effectiveAt: result.effective_at };
    default: {
      const unhandled: never = result;
      throw new Error(`Unhandled checkout result: ${JSON.stringify(unhandled)}`);
    }
  }
}

// Poll a `processing` result's checkout_id, or a paid upgrade's plan_upgrade_intent_id.
// A Stripe upgrade needs the customer and subscription scope.
export async function checkoutSettled(
  checkoutId: string,
  scope?: { customerId: string; subscriptionId: string },
): Promise<boolean> {
  const status = await nozle.checkoutStatus(checkoutId, scope);
  return status.status === 'succeeded' && status.fulfillment_status === 'succeeded';
}
