import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createCheckoutSession } from "@/lib/payments.functions";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";

interface Props {
  priceId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function StripeCheckoutDialog({ priceId, onOpenChange }: Props) {
  const createSession = useServerFn(createCheckoutSession);

  const fetchClientSecret = async (): Promise<string> => {
    if (!priceId) throw new Error("Plan no válido.");
    const result = await createSession({
      data: {
        priceId,
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/planes`,
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("No se ha podido iniciar el pago.");
    return result.clientSecret;
  };

  return (
    <Dialog open={Boolean(priceId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Completar suscripción</DialogTitle>
        </DialogHeader>
        {priceId && (
          <EmbeddedCheckoutProvider
            key={priceId}
            stripe={getStripe()}
            options={{ fetchClientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
