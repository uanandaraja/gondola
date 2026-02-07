import { auth } from "../services/auth";

export async function requireUser(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user?.id) {
		return null;
	}
	return session.user;
}

export function unauthorizedResponse() {
	return new Response(JSON.stringify({ error: "Unauthorized" }), {
		status: 401,
		headers: { "Content-Type": "application/json" },
	});
}

export function notFoundResponse(resource: string) {
	return new Response(JSON.stringify({ error: `${resource} not found` }), {
		status: 404,
		headers: { "Content-Type": "application/json" },
	});
}

export function errorResponse(message: string, status = 500) {
	return new Response(
		JSON.stringify({
			error: message,
		}),
		{
			status,
			headers: { "Content-Type": "application/json" },
		},
	);
}

export function jsonResponse(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}
