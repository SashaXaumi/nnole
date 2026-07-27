import type { Route } from "./+types/api.edge";

// Tiny JSON endpoint the client pings to (a) learn which edge location is
// serving it and (b) measure real round-trip latency for the status section.
export async function loader({ context }: Route.LoaderArgs) {
	const cf = context.cloudflare.cf;
	return Response.json(
		{
			colo: cf?.colo ?? null,
			city: cf?.city ?? null,
			country: cf?.country ?? null,
		},
		{ headers: { "Cache-Control": "no-store" } },
	);
}
