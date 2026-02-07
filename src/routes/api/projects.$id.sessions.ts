import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, validateUUID, withAuth } from "../../server/api-utils";
import { createSession, listSessions } from "../../server/session";

export const Route = createFileRoute("/api/projects/$id/sessions")({
	server: {
		handlers: {
			GET: withAuth(async ({ params, user }) => {
				const error = validateUUID(params.id, "project ID");
				if (error) return error;

				const sessions = await listSessions(params.id, user.id);
				return jsonResponse({ sessions });
			}),
			POST: withAuth(async ({ params, user }) => {
				const error = validateUUID(params.id, "project ID");
				if (error) return error;

				try {
					const session = await createSession(params.id, user.id);
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
			}),
		},
	},
});
