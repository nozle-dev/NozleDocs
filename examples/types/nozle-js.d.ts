declare module '@nozle-js/node' {
  export class Nozle {
    constructor(config: { apiKey: string });
    checkout(
      customerId: string,
      planCode: string,
      returnUrl?: string,
    ): Promise<
      | { type: 'stripe'; url?: string; client_secret?: string; clientSecret?: string }
      | { type: 'completed' | 'scheduled'; status: string }
    >;
  }
}

declare module '@nozle-js/react' {
  import type { ReactNode } from 'react';

  type CheckoutResult =
    | { type: 'stripe'; url?: string; client_secret?: string; clientSecret?: string }
    | { type: 'completed' | 'scheduled'; status: string };

  export function BillingProvider(props: {
    publishableKey: string;
    createCheckout?: (input: {
      planCode: string;
      returnUrl: string;
    }) => Promise<CheckoutResult>;
    children: ReactNode;
  }): ReactNode;

  export function PricingTable(props: { returnUrl?: string }): ReactNode;
}
