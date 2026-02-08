import { createFileRoute } from "@tanstack/react-router";
import {
	jsonResponse,
	notFoundResponse,
	validateUUIDs,
	withAuth,
} from "../../server/api-utils";
import {
	getSessionById,
	resumeSession,
	terminateSession,
} from "../../server/session/index";

export const Route = createFileRoute("/api/projects/$id/sessions/$sid")({
	server: {
		handlers: {
			GET: withAuth(async ({ params, user }) => {
				const error = validateUUIDs({
					"project ID": params.id,
					"session ID": params.sid,
				});
				if (error) return error;

				const session = await getSessionById(params.sid, user.id);
				if (!session) {
					return notFoundResponse("Session");
				}

				return jsonResponse(session);
			}),
			POST: withAuth(async ({ params, user }) => {
				const error = validateUUIDs({
					"project ID": params.id,
					"session ID": params.sid,
				});
				if (error) return error;

				try {
					const session = await resumeSession(params.sid, user.id);
					return jsonResponse(session);
				} catch (error) {
					return jsonResponse(
						{
							error: "Failed to resume session",
							message: error instanceof Error ? error.message : "Unknown error",
						},
						500,
					);
				}
			}),
			DELETE: withAuth(async ({ params, user }) => {
				const error = validateUUIDs({
					"project ID": params.id,
					"session ID": params.sid,
				});
				if (error) return error;

				await terminateSession(params.sid, user.id);
				return new Response(null, { status: 204 });
			}),
		},
	},
});
