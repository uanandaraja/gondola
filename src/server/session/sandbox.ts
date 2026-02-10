import type { Sandbox } from "modal";
import { OPENCODE_STARTUP_WAIT_MS } from "./constants";
import {
	shellEscape,
	validateBranchName,
	validateGitHubUrl,
} from "./validation";

export async function setupSandboxFromScratch(
	sandbox: Sandbox,
	sessionId: string,
	githubUrl: string,
	branch?: string | null,
	githubToken?: string | null,
) {
	// Clone repository
	console.log(`[${sessionId}] Cloning repository...`);

	// Validate inputs to prevent shell injection
	const validatedUrl = validateGitHubUrl(githubUrl);
	const validatedBranch = branch ? validateBranchName(branch) : null;

	// Inject token into URL for private repo access
	let cloneUrl = validatedUrl;
	if (githubToken && cloneUrl.startsWith("https://github.com/")) {
		cloneUrl = cloneUrl.replace(
			"https://github.com/",
			`https://x-access-token:${githubToken}@github.com/`,
		);
	}

	const escapedUrl = shellEscape(cloneUrl);
	const escapedCleanUrl = shellEscape(validatedUrl);
	const escapedBranch = validatedBranch ? shellEscape(validatedBranch) : null;
	const branchFlag = escapedBranch ? `-b ${escapedBranch} ` : "";

	const cloneProc = await sandbox.exec([
		"bash",
		"-c",
		`cd /root/workspace && git clone ${branchFlag}${escapedUrl} repo 2>&1`,
	]);

	const cloneExitCode = await cloneProc.wait();
	const cloneOutput = await cloneProc.stdout.readText();

	if (cloneExitCode !== 0) {
		console.error(
			`[${sessionId}] Clone failed (exit ${cloneExitCode}):`,
			cloneOutput,
		);
		await sandbox.terminate();
		throw new Error(`Failed to clone repository: ${cloneOutput}`);
	}

	console.log(`[${sessionId}] Clone output: ${cloneOutput}`);

	// Strip token from remote URL
	if (githubToken) {
		const resetProc = await sandbox.exec([
			"bash",
			"-c",
			`cd /root/workspace/repo && git remote set-url origin ${escapedCleanUrl}`,
		]);
		try {
			await resetProc.wait();
		} catch (_e) {
			// non-critical
		}
	}

	// Detect branch if not specified
	let detectedBranch = branch;
	if (!detectedBranch) {
		const branchProc = await sandbox.exec([
			"bash",
			"-c",
			"cd /root/workspace/repo && git branch --show-current 2>&1",
		]);
		detectedBranch = (await branchProc.stdout.readText()).trim();
		console.log(`[${sessionId}] Detected branch: ${detectedBranch}`);
	}

	// Install dependencies if package.json exists
	console.log(`[${sessionId}] Checking for dependencies...`);
	const checkPkgProc = await sandbox.exec([
		"bash",
		"-c",
		"test -f /root/workspace/repo/package.json && echo 'found' || echo 'none'",
	]);
	const hasPackageJson =
		(await checkPkgProc.stdout.readText()).trim() === "found";

	if (hasPackageJson) {
		console.log(`[${sessionId}] Installing dependencies...`);
		const installProc = await sandbox.exec([
			"bash",
			"-c",
			"cd /root/workspace/repo && bun install 2>&1",
		]);
		try {
			await installProc.wait();
			console.log(`[${sessionId}] Dependencies installed`);
		} catch (_error) {
			console.warn(
				`[${sessionId}] Dependency install failed (continuing anyway)`,
			);
		}
	}

	// Configure opencode
	await configureOpencode(sandbox, sessionId);
}

export async function configureOpencode(sandbox: Sandbox, sessionId: string) {
	console.log(`[${sessionId}] Configuring opencode...`);
	const configDir = await sandbox.exec([
		"mkdir",
		"-p",
		"/root/.config/opencode",
	]);
	await configDir.wait();

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

	const writeConfig = await sandbox.exec([
		"bash",
		"-c",
		`echo '${configContent}' > /root/.config/opencode/opencode.json`,
	]);
	await writeConfig.wait();
	console.log(`[${sessionId}] Opencode config written`);
}

export async function startOpencodeServer(sandbox: Sandbox, sessionId: string) {
	console.log(`[${sessionId}] Starting opencode server on port 4096...`);
	sandbox
		.exec([
			"bash",
			"-c",
			"cd /root/workspace/repo && HOME=/root opencode serve --port 4096 --hostname 0.0.0.0 --cors '*' > /tmp/opencode.log 2>&1 &",
		])
		.catch(() => {});

	await new Promise((resolve) => setTimeout(resolve, OPENCODE_STARTUP_WAIT_MS));

	const logCheck = await sandbox.exec(["cat", "/tmp/opencode.log"]);
	const logContent = await logCheck.stdout.readText();
	console.log(`[${sessionId}] Opencode log:\n${logContent}`);
}

export async function writeSecretsEnvFile(
	sandbox: Sandbox,
	sessionId: string,
	secrets: Record<string, string>,
) {
	if (Object.keys(secrets).length === 0) return;

	console.log(`[${sessionId}] Writing project secrets to .env...`);
	const envContent = Object.entries(secrets)
		.map(([k, v]) => `${k}=${v}`)
		.join("\n");

	// Use base64 to avoid shell escaping issues with secret values
	const encoded = Buffer.from(envContent).toString("base64");
	const writeProc = await sandbox.exec([
		"bash",
		"-c",
		`echo '${encoded}' | base64 -d > /root/workspace/repo/.env`,
	]);
	await writeProc.wait();
	console.log(`[${sessionId}] Project secrets written to .env`);
}
