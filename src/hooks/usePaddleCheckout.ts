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
    // El proveedor de pago no permite mostrarse dentro de otro marco (la vista previa
    // embebida). En ese caso abrimos la página de planes en una pestaña propia.
    const isFramed = typeof window !== "undefined" && window.self !== window.top;
    if (isFramed) {
      window.open(
        `${window.location.origin}/planes?checkout=${encodeURIComponent(options.priceId)}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
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
