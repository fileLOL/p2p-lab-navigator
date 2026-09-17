import { resolvePaddlePrice } from "@/lib/payments.functions";

const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Paddle: any;
  }
}

export function getPaddleEnvironment(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

let paddleInitialized = false;

const CHECKOUT_LOCALE = "es";

function normalizeBrowserLocale(): void {
  try {
    Intl.getCanonicalLocales(navigator.language);
  } catch {
    Object.defineProperty(navigator, "language", {
      configurable: true,
      get: () => CHECKOUT_LOCALE,
    });
    Object.defineProperty(navigator, "languages", {
      configurable: true,
      get: () => [CHECKOUT_LOCALE],
    });
  }
}

export async function initializePaddle(): Promise<void> {
  if (paddleInitialized) return;
  if (!clientToken) throw new Error("Los pagos no están configurados.");
  normalizeBrowserLocale();

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = () => {
      const jsEnv = getPaddleEnvironment() === "sandbox" ? "sandbox" : "production";
      window.Paddle.Environment.set(jsEnv);
      window.Paddle.Initialize({
        token: clientToken,
        checkout: { settings: { locale: CHECKOUT_LOCALE } },
        pwCustomer: { locale: CHECKOUT_LOCALE },
      });
      paddleInitialized = true;
      resolve();
    };
    script.onerror = () => reject(new Error("No se ha podido cargar el sistema de pago."));
    document.head.appendChild(script);
  });
}

export async function getPaddlePriceId(priceId: string): Promise<string> {
  return resolvePaddlePrice({ data: { priceId, environment: getPaddleEnvironment() } });
}
