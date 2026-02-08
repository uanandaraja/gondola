import { z } from "zod";
import {
	errorResponse,
	jsonResponse,
	notFoundResponse,
	requireUser,
	unauthorizedResponse,
} from "../lib/auth";

// User type inferred from requireUser return type
type User = NonNullable<Awaited<ReturnType<typeof requireUser>>>;

const uuidSchema = z.string().uuid("Invalid UUID format");

interface RouteContext<TParams> {
	params: TParams;
	request: Request;
}

interface AuthenticatedContext<TParams> {
	params: TParams;
	request: Request;
	user: User;
}

/**
 * Wraps an API handler to inject authenticated user and handle unauthorized responses.
 */
export function withAuth<TParams>(
	handler: (ctx: AuthenticatedContext<TParams>) => Promise<Response>,
): (ctx: RouteContext<TParams>) => Promise<Response> {
	return async ({ params, request }: RouteContext<TParams>) => {
		const user = await requireUser(request);
		if (!user) {
			return unauthorizedResponse();
		}
		return handler({ params, request, user });
	};
}

/**
 * Validates a UUID string and returns a 400 error response if invalid.
 */
export function validateUUID(id: string, fieldName = "ID"): Response | null {
	const validation = uuidSchema.safeParse(id);
	if (!validation.success) {
		return errorResponse(
			`Invalid ${fieldName}: ${validation.error.issues[0]?.message || "Invalid UUID format"}`,
			400,
		);
	}
	return null;
}

/**
 * Validates multiple UUID strings and returns a 400 error response if any are invalid.
 */
export function validateUUIDs(ids: Record<string, string>): Response | null {
	for (const [fieldName, id] of Object.entries(ids)) {
		const error = validateUUID(id, fieldName);
		if (error) return error;
	}
	return null;
}

export {
	errorResponse,
	jsonResponse,
	notFoundResponse,
	requireUser,
	unauthorizedResponse,
};
