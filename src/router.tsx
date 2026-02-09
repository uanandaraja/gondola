import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient();

const router = createTanStackRouter({
	routeTree,
	context: { queryClient },
});

export function getRouter() {
	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
