import { Effect } from "effect";
import type { Sandbox } from "modal";
import {
	shellEscape,
	validateBranchName,
	validateGitHubUrl,
} from "@/services/projects/validation";
import { OPENCODE_STARTUP_WAIT_MS } from "./constants";
import { GitCloneError, OpencodeStartError } from "./errors";

export function setupSandboxFromScratch(
	sandbox: Sandbox,
	sessionId: string,
	githubUrl: string,
	branch?: string | null,
) {
	return Effect.gen(function* () {
		console.log(`[${sessionId}] Cloning repository...`);

		const validatedUrl = validateGitHubUrl(githubUrl);
		const validatedBranch = branch ? validateBranchName(branch) : null;

		const escapedUrl = shellEscape(validatedUrl);
		const escapedBranch = validatedBranch ? shellEscape(validatedBranch) : null;
		const branchFlag = escapedBranch ? `-b ${escapedBranch} ` : "";

		const cloneProc = yield* Effect.tryPromise({
			try: () =>
				sandbox.exec([
					"bash",
					"-c",
					`cd /root/workspace && git clone ${branchFlag}${escapedUrl} repo 2>&1`,
				]),
			catch: (_e) =>
				new GitCloneError({
					message: "Failed to start git clone",
				}),
		});

		const cloneOutput = yield* Effect.tryPromise({
			try: () => cloneProc.stdout.readText(),
			catch: () => "",
		});
		const cloneError = yield* Effect.tryPromise({
			try: () => cloneProc.stderr.readText(),
			catch: () => "",
		});

		yield* Effect.tryPromise({
			try: () => cloneProc.wait(),
			catch: () =>
				new GitCloneError({
					message: "Git clone failed",
					output: cloneError || cloneOutput,
				}),
		});

		console.log(`[${sessionId}] Clone output: ${cloneOutput}`);

		// Detect branch if not specified
		let detectedBranch = branch;
		if (!detectedBranch) {
			const branchProc = yield* Effect.tryPromise({
				try: () =>
					sandbox.exec([
						"bash",
						"-c",
						"cd /root/workspace/repo && git branch --show-current 2>&1",
					]),
				catch: (_e) =>
					new GitCloneError({ message: "Failed to detect branch" }),
			});
			const branchOutput = yield* Effect.tryPromise({
				try: () => branchProc.stdout.readText(),
				catch: () => "",
			});
			detectedBranch = branchOutput.trim();
			console.log(`[${sessionId}] Detected branch: ${detectedBranch}`);
		}

		// Check for package.json
		console.log(`[${sessionId}] Checking for dependencies...`);
		const checkPkgProc = yield* Effect.tryPromise({
			try: () =>
				sandbox.exec([
					"bash",
					"-c",
					"test -f /root/workspace/repo/package.json && echo 'found' || echo 'none'",
				]),
			catch: () => null,
		});
		const hasPackageJson =
			(yield* Effect.tryPromise({
				try: () => checkPkgProc.stdout.readText(),
				catch: () => "none",
			})).trim() === "found";

		if (hasPackageJson) {
			console.log(`[${sessionId}] Installing dependencies...`);
			const installProc = yield* Effect.tryPromise({
				try: () =>
					sandbox.exec([
						"bash",
						"-c",
						"cd /root/workspace/repo && bun install 2>&1",
					]),
				catch: () => null,
			});
			yield* Effect.try({
				try: () => installProc.wait(),
				catch: () => {
					console.warn(
						`[${sessionId}] Dependency install failed (continuing anyway)`,
					);
				},
			});
		}

		// Configure opencode
		yield* configureOpencode(sandbox, sessionId);
	});
}

export function configureOpencode(sandbox: Sandbox, sessionId: string) {
	return Effect.gen(function* () {
		console.log(`[${sessionId}] Configuring opencode...`);

		const configDir = yield* Effect.tryPromise({
			try: () => sandbox.exec(["mkdir", "-p", "/root/.config/opencode"]),
			catch: (_e) =>
				new OpencodeStartError({ message: "Failed to create config dir" }),
		});
		yield* Effect.tryPromise({
			try: () => configDir.wait(),
			catch: (_e) =>
				new OpencodeStartError({ message: "Failed to create config dir" }),
		});

		const configContent = JSON.stringify(
			{
				$schema: "https://opencode.ai/config.json",
				model: "kimi-for-coding/k2p5",
				provider: {
					"kimi-for-coding": {
						options: {
							apiKey: "{env:KIMI_API_KEY}",
							baseURL: "https://api.kimi.com/coding/v1",
						},
					},
				},
			},
			null,
			2,
		);

		const writeConfig = yield* Effect.tryPromise({
			try: () =>
				sandbox.exec([
					"bash",
					"-c",
					`echo '${configContent}' > /root/.config/opencode/opencode.json`,
				]),
			catch: (_e) =>
				new OpencodeStartError({ message: "Failed to write config" }),
		});
		yield* Effect.tryPromise({
			try: () => writeConfig.wait(),
			catch: (_e) =>
				new OpencodeStartError({ message: "Failed to write config" }),
		});

		console.log(`[${sessionId}] Opencode config written`);
	});
}

export function startOpencodeServer(sandbox: Sandbox, sessionId: string) {
	return Effect.gen(function* () {
		console.log(`[${sessionId}] Starting opencode server on port 4096...`);

		yield* Effect.tryPromise({
			try: () =>
				sandbox.exec([
					"bash",
					"-c",
					"cd /root/workspace/repo && HOME=/root opencode serve --port 4096 --hostname 0.0.0.0 --cors '*' > /tmp/opencode.log 2>&1 &",
				]),
			catch: () => null,
		});

		yield* Effect.promise(
			() =>
				new Promise((resolve) => setTimeout(resolve, OPENCODE_STARTUP_WAIT_MS)),
		);

		const logCheck = yield* Effect.tryPromise({
			try: () => sandbox.exec(["cat", "/tmp/opencode.log"]),
			catch: () => null,
		});
		const logContent = yield* Effect.tryPromise({
			try: () => logCheck.stdout.readText(),
			catch: () => "",
		});
		console.log(`[${sessionId}] Opencode log:\n${logContent}`);
	});
}

export function writeSecretsEnvFile(
	sandbox: Sandbox,
	sessionId: string,
	secrets: Record<string, string>,
) {
	return Effect.gen(function* () {
		if (Object.keys(secrets).length === 0) return;

		console.log(`[${sessionId}] Writing project secrets to .env...`);
		const envContent = Object.entries(secrets)
			.map(([k, v]) => `${k}=${v}`)
			.join("\n");

		const encoded = Buffer.from(envContent).toString("base64");
		const writeProc = yield* Effect.tryPromise({
			try: () =>
				sandbox.exec([
					"bash",
					"-c",
					`echo '${encoded}' | base64 -d > /root/workspace/repo/.env`,
				]),
			catch: (_e) =>
				new OpencodeStartError({ message: "Failed to write .env" }),
		});
		yield* Effect.tryPromise({
			try: () => writeProc.wait(),
			catch: (_e) =>
				new OpencodeStartError({ message: "Failed to write .env" }),
		});

		console.log(`[${sessionId}] Project secrets written to .env`);
	});
}
