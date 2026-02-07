import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
	notFoundResponse,
	requireUser,
	unauthorizedResponse,
} from "../../lib/auth";
import {
	getSessionById,
	resumeSession,
	terminateSession,
} from "../../server/session";

// Validation schemas
const uuidSchema = z.string().uuid("Invalid UUID format");

/**
 * Validates project ID and session ID UUID format.
 * Returns null if valid, otherwise returns error Response.
 */
function validateIds(
	id: string,
	sid: string,
): { valid: true } | { valid: false; response: Response } {
	const idValidation = uuidSchema.safeParse(id);
	if (!idValidation.success) {
		return {
			valid: false,
			response: new Response(
				JSON.stringify({
					error: "Invalid project ID",
					details: idValidation.error.issues,
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			),
		};
	}

	const sidValidation = uuidSchema.safeParse(sid);
	if (!sidValidation.success) {
		return {
			valid: false,
			response: new Response(
				JSON.stringify({
					error: "Invalid session ID",
					details: sidValidation.error.issues,
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			),
		};
	}

	return { valid: true };
}

export const Route = createFileRoute("/api/projects/$id/sessions/$sid")({
	server: {
		handlers: {
			GET: async ({
				params,
				request,
			}: {
				params: { id: string; sid: string };
				request: Request;
			}) => {
				const user = await requireUser(request);
				if (!user) {
					return unauthorizedResponse();
				}

				const validation = validateIds(params.id, params.sid);
				if (!validation.valid) {
					return validation.response;
				}

				const session = await getSessionById(params.sid, user.id);
				if (!session) {
					return notFoundResponse("Session");
				}

				return new Response(JSON.stringify(session), {
					headers: { "Content-Type": "application/json" },
				});
			},
			POST: async ({
				params,
				request,
			}: {
				params: { id: string; sid: string };
				request: Request;
			}) => {
				const user = await requireUser(request);
				if (!user) {
					return unauthorizedResponse();
				}

				const validation = validateIds(params.id, params.sid);
				if (!validation.valid) {
					return validation.response;
				}

				try {
					const session = await resumeSession(params.sid, user.id);
					return new Response(JSON.stringify(session), {
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					return new Response(
						JSON.stringify({
							error: "Failed to resume session",
							message: error instanceof Error ? error.message : "Unknown error",
						}),
						{
							status: 500,
							headers: { "Content-Type": "application/json" },
						},
					);
				}
			},
			DELETE: async ({
				params,
				request,
			}: {
				params: { id: string; sid: string };
				request: Request;
			}) => {
				const user = await requireUser(request);
				if (!user) {
					return unauthorizedResponse();
				}

				const validation = validateIds(params.id, params.sid);
				if (!validation.valid) {
					return validation.response;
				}

				await terminateSession(params.sid, user.id);
				return new Response(null, { status: 204 });
			},
		},
	},
});
