import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../services/auth";
import {
	createSandbox,
	deleteSandbox,
	getSandbox,
	listSandboxes,
} from "./sandbox";

async function requireUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session?.user?.id) {
		throw new Error("Unauthorized");
	}
	return session.user.id;
}

export const fetchSandboxes = createServerFn({ method: "GET" }).handler(
	async () => {
		const userId = await requireUserId();
		return await listSandboxes(userId);
	},
);

export const fetchSandbox = createServerFn({ method: "GET" })
	.inputValidator((id: string) => id)
	.handler(async ({ data: id }) => {
		const userId = await requireUserId();
		return await getSandbox(id, userId);
	});

export const createNewSandbox = createServerFn({ method: "POST" })
	.inputValidator((data: { gitUrl: string; branch?: string }) => data)
	.handler(async ({ data }) => {
		const userId = await requireUserId();
		return await createSandbox(data.gitUrl, userId, data.branch);
	});

export const removeSandbox = createServerFn({ method: "POST" })
	.inputValidator((id: string) => id)
	.handler(async ({ data: id }) => {
		const userId = await requireUserId();
		await deleteSandbox(id, userId);
	});
