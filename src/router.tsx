import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

const router = createTanStackRouter({ routeTree });

export function getRouter() {
	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
