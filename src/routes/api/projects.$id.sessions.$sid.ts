import { createFileRoute } from "@tanstack/react-router";
import {
	jsonResponse,
	notFoundResponse,
	requireUser,
	unauthorizedResponse,
	validateUUIDs,
} from "../../server/api-utils";
import {
	getSessionById,
	resumeSession,
	terminateSession,
} from "../../server/session/index";

// Child routes don't automatically inherit parent params in TanStack Start types
// See: https://github.com/TanStack/router/issues/...
interface RouteParams {
	id: string;
	sid: string;
}

export const Route = createFileRoute("/api/projects/$id/sessions/$sid")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				const user = await requireUser(request);
				if (!user) return unauthorizedResponse();

				const { id, sid } = params as RouteParams;

				const error = validateUUIDs({
					"project ID": id,
					"session ID": sid,
				});
				if (error) return error;

				const session = await getSessionById(sid, user.id);
				if (!session) {
					return notFoundResponse("Session");
				}

				return jsonResponse(session);
			},
			POST: async ({ params, request }) => {
				const user = await requireUser(request);
				if (!user) return unauthorizedResponse();

				const { id, sid } = params as RouteParams;

				const error = validateUUIDs({
					"project ID": id,
					"session ID": sid,
				});
				if (error) return error;

				try {
					const session = await resumeSession(sid, user.id);
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
			},
			DELETE: async ({ params, request }) => {
				const user = await requireUser(request);
				if (!user) return unauthorizedResponse();

				const { id, sid } = params as RouteParams;

				const error = validateUUIDs({
					"project ID": id,
					"session ID": sid,
				});
				if (error) return error;

				await terminateSession(sid, user.id);
				return new Response(null, { status: 204 });
			},
		},
	},
});
