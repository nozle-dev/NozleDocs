import {
  Nozle,
  type CheckoutStatus,
  type RazorpayCheckoutResult,
  type RazorpayVerification,
} from '@nozle-js/node';
import { BillingProvider, CheckoutButton } from '@nozle-js/react';

const nozle = new Nozle({ apiKey: 'sk_example' });

// Merchant backend: create the checkout for the authenticated customer.
export async function createCheckout(customerId: string, planCode: string) {
  return nozle.checkout(
    customerId,
    planCode,
    'https://app.example.com/settings/billing',
    { idempotencyKey: `checkout-${customerId}-${planCode}-v1` },
  );
}

// Merchant backend: verify the handler's payment, then read the status.
export async function verifyPayment(
  checkoutId: string,
  razorpay: RazorpayVerification,
  customerId: string,
  subscriptionId: string,
): Promise<CheckoutStatus> {
  const scope = { customerId, subscriptionId };
  await nozle.verifyCheckout(checkoutId, razorpay, scope);
  return nozle.checkoutStatus(checkoutId, scope);
}

// Browser: open the Razorpay modal for a `razorpay` result.
type RazorpayModal = new (options: Record<string, unknown>) => { open(): void };

export function openRazorpay(
  checkout: RazorpayCheckoutResult,
  onPaid: (razorpay: RazorpayVerification) => void,
) {
  const Razorpay = (window as unknown as { Razorpay: RazorpayModal }).Razorpay;
  new Razorpay({
    key: checkout.key_id,
    order_id: checkout.order_id,
    amount: checkout.amount_cents,
    currency: checkout.currency,
    handler: onPaid,
  }).open();
}

// React: the provider callbacks call your merchant backend.
export function BillingApp({ publishableKey }: { publishableKey: string }) {
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
      verifyCheckout={async (checkoutId, verification) => {
        const response = await fetch(`/api/billing/checkout/${checkoutId}/verify`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(verification),
        });
        if (!response.ok) throw new Error('Verification failed');
        return response.json();
      }}
      getCheckoutStatus={async (checkoutId) => {
        const response = await fetch(`/api/billing/checkout/${checkoutId}`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Status failed');
        return response.json();
      }}
    >
      <CheckoutButton planCode="pro_monthly" />
    </BillingProvider>
  );
}
