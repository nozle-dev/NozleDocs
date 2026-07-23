import type { ReactNode } from 'react';

import { Nozle } from '@nozle-js/node';
import { BillingProvider, useCheckoutSession } from '@nozle-js/react';

export async function mintCustomerSession(secretKey: string, customerId: string) {
  const nozle = new Nozle({ apiKey: secretKey });

  return nozle.customerSessions.create({
    customerId,
    expiresInSeconds: 900,
    scopes: ['billing:read', 'checkout:create', 'subscriptions:write'],
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
      {children}
    </BillingProvider>
  );
}

export function PaidPlanButton({ planCode }: { planCode: string }) {
  const { fetchClientSecret, isLoading } = useCheckoutSession();

  return (
    <button disabled={isLoading} onClick={() => void fetchClientSecret(planCode)}>
      Continue to checkout
    </button>
  );
}
