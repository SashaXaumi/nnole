import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("api/edge", "routes/api.edge.ts"),
] satisfies RouteConfig;
