import { useState } from "react";

import { getPaddlePriceId, initializePaddle } from "@/lib/paddle";

interface CheckoutOptions {
  priceId: string;
  customerEmail?: string;
  userId: string;
  successUrl?: string;
}

export function usePaddleCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async (options: CheckoutOptions) => {
    setLoading(true);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(options.priceId);

      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        ...(options.customerEmail ? { customer: { email: options.customerEmail } } : {}),
        customData: { userId: options.userId },
        settings: {
          displayMode: "overlay",
          locale: "es",
          successUrl: options.successUrl ?? `${window.location.origin}/planes?checkout=ok`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}
