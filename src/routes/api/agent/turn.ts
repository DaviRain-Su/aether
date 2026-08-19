import { createFileRoute } from "@tanstack/react-router";
import { runTurn, sseResponse, type TurnInput } from "@/lib/server/agent";

export const Route = createFileRoute("/api/agent/turn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as TurnInput;
        if (!body?.text || typeof body.text !== "string") {
          return Response.json({ error: "Missing text" }, { status: 400 });
        }
        const text = body.text.slice(0, 8000);
        return sseResponse((emit) => runTurn({ ...body, text }, emit));
      },
    },
  },
});
