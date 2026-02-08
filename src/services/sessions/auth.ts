import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import type { Sandbox } from "modal";
import * as schema from "@/db/schema";
import { DatabaseClient } from "@/infra/db";
import { DatabaseError } from "@/services/errors";
import { shellEscape } from "@/services/projects/validation";

export function getGitHubAccount(userId: string) {
	return Effect.gen(function* () {
		const db = yield* DatabaseClient;
		return yield* Effect.tryPromise({
			try: async () => {
				const rows = await db
					.select()
					.from(schema.account)
					.where(
						and(
							eq(schema.account.userId, userId),
							eq(schema.account.providerId, "github"),
						),
					)
					.limit(1);
				return rows[0] ?? null;
			},
			catch: (e) => new DatabaseError({ cause: e }),
		});
	});
}

export function getUserInfo(userId: string) {
	return Effect.gen(function* () {
		const db = yield* DatabaseClient;
		return yield* Effect.tryPromise({
			try: async () => {
				const rows = await db
					.select()
					.from(schema.user)
					.where(eq(schema.user.id, userId))
					.limit(1);
				return rows[0] ?? null;
			},
			catch: (e) => new DatabaseError({ cause: e }),
		});
	});
}

export function configureGitAuth(
	sandbox: Sandbox,
	sessionId: string,
	githubToken: string,
	userName: string,
	userEmail: string,
) {
	return Effect.gen(function* () {
		console.log(`[${sessionId}] Configuring git and gh auth...`);

		// Set GITHUB_TOKEN in ~/.bashrc
		const exportLine = `export GITHUB_TOKEN=${githubToken}`;
		const encoded = Buffer.from(exportLine).toString("base64");
		const envProc = yield* Effect.tryPromise({
			try: () =>
				sandbox.exec([
					"bash",
					"-c",
					`echo '${encoded}' | base64 -d >> /root/.bashrc`,
				]),
			catch: (e) =>
				new DatabaseError({
					cause: e,
				}),
		});
		yield* Effect.tryPromise({
			try: () => envProc.wait(),
			catch: (e) => new DatabaseError({ cause: e }),
		});

		// Configure git user identity
		const escapedUserName = shellEscape(userName);
		const escapedUserEmail = shellEscape(userEmail);
		const gitConfigProc = yield* Effect.tryPromise({
			try: () =>
				sandbox.exec([
					"bash",
					"-c",
					`git config --global user.name ${escapedUserName} && git config --global user.email ${escapedUserEmail}`,
				]),
			catch: (e) => new DatabaseError({ cause: e }),
		});
		yield* Effect.tryPromise({
			try: () => gitConfigProc.wait(),
			catch: (e) => new DatabaseError({ cause: e }),
		});

		// Configure git credential helper
		const credProc = yield* Effect.tryPromise({
			try: () =>
				sandbox.exec([
					"bash",
					"-c",
					`git config --global credential.helper '!f() { echo "username=x-access-token"; echo "password=\${GITHUB_TOKEN}"; }; f'`,
				]),
			catch: (e) => new DatabaseError({ cause: e }),
		});
		yield* Effect.tryPromise({
			try: () => credProc.wait(),
			catch: (e) => new DatabaseError({ cause: e }),
		});

		// Set up gh CLI auth
		const escapedToken = shellEscape(githubToken);
		const ghProc = yield* Effect.tryPromise({
			try: () =>
				sandbox.exec([
					"bash",
					"-c",
					`GITHUB_TOKEN=${escapedToken} gh auth setup-git`,
				]),
			catch: (e) => new DatabaseError({ cause: e }),
		});
		yield* Effect.tryPromise({
			try: () => ghProc.wait(),
			catch: (e) => new DatabaseError({ cause: e }),
		});

		console.log(`[${sessionId}] Git auth configured for ${userName}`);
	});
}
