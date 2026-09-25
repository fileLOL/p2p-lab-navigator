import { createFileRoute } from "@tanstack/react-router";

// Diagnóstico temporal: comprueba qué fuentes P2P responden desde el servidor publicado.
export const Route = createFileRoute("/api/public/p2p-probe")({
  server: {
    handlers: {
      GET: async () => {
        const { binanceP2PSource, bybitSource } = await import("@/lib/p2p/sources.server");
        const params = { asset: "USDT", fiat: "EUR", side: "buy", limit: 10 } as never;
        const [b, y] = await Promise.all([
          binanceP2PSource.fetchOffers(params),
          bybitSource.fetchOffers(params),
        ]);
        return Response.json({
          binance: { status: b.status, message: b.message, count: b.offers.length },
          bybit: { status: y.status, message: y.message, count: y.offers.length },
        });
      },
    },
  },
});
