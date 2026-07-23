declare module '@nozle-js/node' {
  type CustomerSessionScope =
    | 'credits:read'
    | 'billing:read'
    | 'entitlements:read'
    | 'checkout:create'
    | 'subscriptions:write'
    | 'topups:create';

  export class Nozle {
    constructor(config: { apiKey: string });
    customerSessions: {
      create(input: {
        customerId: string;
        expiresInSeconds?: number;
        scopes?: CustomerSessionScope[];
      }): Promise<{ token: string; customer_id: string; expires_at: string; scope: CustomerSessionScope[] }>;
    };
  }
}

declare module '@nozle-js/react' {
  import type { ReactNode } from 'react';

  export function BillingProvider(props: {
    publishableKey?: string;
    customerSessionToken?: string;
    customerId?: string;
    baseUrl?: string;
    children: ReactNode;
  }): ReactNode;

  export function useCheckoutSession(): {
    fetchClientSecret(planCode: string, successUrl?: string): Promise<string | null>;
    checkout: { type?: 'stripe' | 'completed' | 'scheduled' } | null;
    isLoading: boolean;
    error: Error | null;
  };
}
