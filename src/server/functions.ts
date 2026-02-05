import { createServerFn } from "@tanstack/react-start";
import {
	createSandbox,
	deleteSandbox,
	getSandbox,
	listSandboxes,
} from "./sandbox";

export const fetchSandboxes = createServerFn({ method: "GET" }).handler(
	async () => {
		return await listSandboxes();
	},
);

export const fetchSandbox = createServerFn({ method: "GET" })
	.inputValidator((id: string) => id)
	.handler(async ({ data: id }) => {
		return await getSandbox(id);
	});

export const createNewSandbox = createServerFn({ method: "POST" })
	.inputValidator((data: { gitUrl: string; branch?: string }) => data)
	.handler(async ({ data }) => {
		return await createSandbox(data.gitUrl, data.branch);
	});

export const removeSandbox = createServerFn({ method: "POST" })
	.inputValidator((id: string) => id)
	.handler(async ({ data: id }) => {
		await deleteSandbox(id);
	});
