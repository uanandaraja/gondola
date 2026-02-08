import { and, eq } from "drizzle-orm";
import type { Sandbox } from "modal";
import { db, schema } from "../../db";
import { shellEscape } from "./validation";

export async function getGitHubAccount(userId: string) {
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
}

export async function getUserInfo(userId: string) {
	const rows = await db
		.select()
		.from(schema.user)
		.where(eq(schema.user.id, userId))
		.limit(1);
	return rows[0] ?? null;
}

export async function configureGitAuth(
	sandbox: Sandbox,
	sessionId: string,
	githubToken: string,
	userName: string,
	userEmail: string,
) {
	console.log(`[${sessionId}] Configuring git and gh auth...`);

	// Set GITHUB_TOKEN in ~/.bashrc so it persists for all shell sessions
	const exportLine = `export GITHUB_TOKEN=${githubToken}`;
	const encoded = Buffer.from(exportLine).toString("base64");
	const envProc = await sandbox.exec([
		"bash",
		"-c",
		`echo '${encoded}' | base64 -d >> /root/.bashrc`,
	]);
	await envProc.wait();

	// Configure git user identity
	const escapedUserName = shellEscape(userName);
	const escapedUserEmail = shellEscape(userEmail);
	const gitConfigProc = await sandbox.exec([
		"bash",
		"-c",
		`git config --global user.name ${escapedUserName} && git config --global user.email ${escapedUserEmail}`,
	]);
	await gitConfigProc.wait();

	// Configure git credential helper to use GITHUB_TOKEN
	const credProc = await sandbox.exec([
		"bash",
		"-c",
		`git config --global credential.helper '!f() { echo "username=x-access-token"; echo "password=\${GITHUB_TOKEN}"; }; f'`,
	]);
	await credProc.wait();

	// Set up gh CLI auth
	const escapedToken = shellEscape(githubToken);
	const ghProc = await sandbox.exec([
		"bash",
		"-c",
		`GITHUB_TOKEN=${escapedToken} gh auth setup-git`,
	]);
	await ghProc.wait();

	console.log(`[${sessionId}] Git auth configured for ${userName}`);
}
