import type { ReactNode } from 'react';

import { Nozle } from '@nozle-js/node';
import { BillingProvider, PricingTable, useCheckoutSession } from '@nozle-js/react';

export async function mintCustomerSession(secretKey: string, customerId: string) {
  const nozle = new Nozle({ apiKey: secretKey });

  return nozle.customerSessions.create({
    customerId,
    expiresInSeconds: 900,
    scopes: [
      'billing:read',
      'entitlements:read',
      'credits:read',
      'checkout:create',
      'subscriptions:write',
      'topups:create',
    ],
  });
}

export function BillingApp({
  children,
  customerId,
  customerSessionToken,
  publishableKey,
}: {
  children: ReactNode;
  customerId: string;
  customerSessionToken: string;
  publishableKey: string;
}) {
  return (
    <BillingProvider
      publishableKey={publishableKey}
      customerSessionToken={customerSessionToken}
      customerId={customerId}
    >
      <PricingTable />
      {children}
    </BillingProvider>
  );
}

export function PaidPlanButton({ planCode }: { planCode: string }) {
  const { fetchClientSecret, checkout, isLoading } = useCheckoutSession();

  return (
    <button disabled={isLoading} onClick={() => void fetchClientSecret(planCode)}>
      {checkout?.type === 'scheduled' ? 'Plan change scheduled' : 'Continue to checkout'}
    </button>
  );
}
