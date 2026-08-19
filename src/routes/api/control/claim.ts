import { createFileRoute } from "@tanstack/react-router";
import { claimCode } from "@/lib/control-plane/vault";

export const Route = createFileRoute("/api/control/claim")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          code?: string;
          fingerprint?: string;
          name?: string;
        };
        try {
          const out = await claimCode({
            code: String(body.code ?? ""),
            fingerprint: String(body.fingerprint ?? ""),
            name: body.name,
          });
          return Response.json(out);
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "claim failed" },
            { status: 400 },
          );
        }
      },
    },
  },
});
