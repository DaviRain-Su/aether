import { createFileRoute } from "@tanstack/react-router";
import { loadWalletSnapshot, mintLiveWallet } from "@/lib/wallet/service";

export const Route = createFileRoute("/api/wallet")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        try {
          const snap = await loadWalletSnapshot({
            deviceId: url.searchParams.get("deviceId"),
            ownerId: url.searchParams.get("ownerId"),
          });
          return Response.json(snap);
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "wallet failed" },
            { status: 400 },
          );
        }
      },
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          action?: string;
          deviceId?: string;
          ownerId?: string;
        };
        try {
          if (body.action === "mint") {
            return Response.json(await mintLiveWallet());
          }
          return Response.json(await loadWalletSnapshot({ deviceId: body.deviceId, ownerId: body.ownerId }));
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "wallet failed" },
            { status: 400 },
          );
        }
      },
    },
  },
});
