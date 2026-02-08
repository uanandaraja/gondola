import { createFileRoute } from "@tanstack/react-router";
import {
	jsonResponse,
	requireUser,
	unauthorizedResponse,
	validateUUID,
} from "../../server/api-utils";
import { createSession, listSessions } from "../../server/session/index";

// Child routes don't automatically inherit parent params in TanStack Start types
// See: https://github.com/TanStack/router/issues/...
interface RouteParams {
	id: string;
}

export const Route = createFileRoute("/api/projects/$id/sessions")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				const user = await requireUser(request);
				if (!user) return unauthorizedResponse();

				const { id } = params as RouteParams;

				const error = validateUUID(id, "project ID");
				if (error) return error;

				const sessions = await listSessions(id, user.id);
				return jsonResponse({ sessions });
			},
			POST: async ({ params, request }) => {
				const user = await requireUser(request);
				if (!user) return unauthorizedResponse();

				const { id } = params as RouteParams;

				const error = validateUUID(id, "project ID");
				if (error) return error;

				try {
					const session = await createSession(id, user.id);
					return jsonResponse(session, 201);
				} catch (error) {
					return jsonResponse(
						{
							error: "Failed to create session",
							message: error instanceof Error ? error.message : "Unknown error",
						},
						500,
					);
				}
			},
		},
	},
});
