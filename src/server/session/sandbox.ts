import type { Sandbox } from "modal";
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
) {
	// Clone repository
	console.log(`[${sessionId}] Cloning repository...`);

	// Validate inputs to prevent shell injection
	const validatedUrl = validateGitHubUrl(githubUrl);
	const validatedBranch = branch ? validateBranchName(branch) : null;

	const escapedUrl = shellEscape(validatedUrl);
	const escapedBranch = validatedBranch ? shellEscape(validatedBranch) : null;
	const branchFlag = escapedBranch ? `-b ${escapedBranch} ` : "";

	const cloneProc = await sandbox.exec([
		"bash",
		"-c",
		`cd /root/workspace && git clone ${branchFlag}${escapedUrl} repo 2>&1`,
	]);

	const cloneOutput = await cloneProc.stdout.readText();
	const cloneError = await cloneProc.stderr.readText();

	try {
		await cloneProc.wait();
		console.log(`[${sessionId}] Clone output: ${cloneOutput}`);
	} catch (_error) {
		console.error(`[${sessionId}] Clone failed:`, cloneError || cloneOutput);
		await sandbox.terminate();
		throw new Error(`Failed to clone repository: ${cloneError || cloneOutput}`);
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

	await new Promise((resolve) => setTimeout(resolve, 6000));

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
