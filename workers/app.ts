import { createRequestHandler } from "react-router";

export interface EdgeInfo {
	colo?: string;
	city?: string;
	country?: string;
}

declare module "react-router" {
	export interface AppLoadContext {
		cloudflare: {
			env: Env;
			ctx: ExecutionContext;
			cf?: EdgeInfo;
		};
	}
}

const requestHandler = createRequestHandler(
	() => import("virtual:react-router/server-build"),
	import.meta.env.MODE,
);

export default {
	fetch(request, env, ctx) {
		const cf = request.cf as EdgeInfo | undefined;
		return requestHandler(request, {
			cloudflare: { env, ctx, cf },
		});
	},
} satisfies ExportedHandler<Env>;
