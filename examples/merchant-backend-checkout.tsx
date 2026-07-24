import type { ReactNode } from 'react';

import { Nozle } from '@nozle-js/node';
import { BillingProvider, PricingTable } from '@nozle-js/react';

interface AuthenticatedUser {
  teamId: string;
}

interface CheckoutRequest {
  user: AuthenticatedUser | null;
  body: Record<string, unknown>;
  csrfValid: boolean;
}

const allowedPlans = new Set(['free', 'pro', 'max']);
const allowedReturnOrigins = new Set(['https://wrrk.ai']);

async function lookupNozleCustomerForTeam(teamId: string): Promise<string> {
  return `team_${teamId}`;
}

export async function postBillingCheckout(
  request: CheckoutRequest,
  secretKey: string,
) {
  if (!request.user) throw new Error('Unauthenticated');
  if (!request.csrfValid) throw new Error('Invalid CSRF token');
  if ('customerId' in request.body || 'customer_id' in request.body) {
    throw new Error('Browser customer IDs are not accepted');
  }

  const planCode = String(request.body.planCode ?? '');
  const returnUrl = new URL(String(request.body.returnUrl ?? ''));
  if (!allowedPlans.has(planCode)) throw new Error('Invalid plan');
  if (returnUrl.protocol !== 'https:' || !allowedReturnOrigins.has(returnUrl.origin)) {
    throw new Error('Invalid return URL');
  }

  const customerId = await lookupNozleCustomerForTeam(request.user.teamId);
  const nozle = new Nozle({ apiKey: secretKey });
  return nozle.checkout(customerId, planCode, returnUrl.toString());
}

export function BillingApp({
  children,
  csrfToken,
  publishableKey,
}: {
  children?: ReactNode;
  csrfToken: string;
  publishableKey: string;
}) {
  return (
    <BillingProvider
      publishableKey={publishableKey}
      createCheckout={async ({ planCode, returnUrl }) => {
        const response = await fetch('/api/billing/checkout', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({ planCode, returnUrl }),
        });
        if (!response.ok) throw new Error('Checkout failed');
        return response.json();
      }}
    >
      <PricingTable returnUrl="https://wrrk.ai/settings/billing" />
      {children}
    </BillingProvider>
  );
}
