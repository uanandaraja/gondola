#!/usr/bin/env bun
/**
 * Build Modal image with opencode pre-installed
 *
 * Usage: bun run scripts/build-image.ts
 *
 * This creates a pre-built Modal image with:
 * - Base: oven/bun:1.1-debian
 * - System tools: git, curl, wget, procps, ripgrep, unzip
 * - Global opencode installation via official install script
 */

import "dotenv/config";
import { ModalClient } from "modal";

const MODAL_APP_NAME = process.env.MODAL_APP_NAME || "gondola";

async function main() {
	console.log("🔨 Building Modal image with opencode...\n");

	// Check Modal credentials
	if (!process.env.MODAL_TOKEN_ID || !process.env.MODAL_TOKEN_SECRET) {
		console.error(
			"❌ Error: MODAL_TOKEN_ID and MODAL_TOKEN_SECRET must be set",
		);
		console.error("   Get them from: https://modal.com/settings");
		process.exit(1);
	}

	const client = new ModalClient();

	console.log("📦 Creating Modal app...");
	const app = await client.apps.fromName(MODAL_APP_NAME, {
		createIfMissing: true,
	});
	console.log(`   App: ${MODAL_APP_NAME}`);

	console.log("\n🐳 Building image...");
	console.log("   Base: oven/bun:1.1-debian");
	console.log("   Tools: git, curl, wget, procps, ripgrep, unzip");
	console.log("   Package: opencode (via install script)");

	const startTime = Date.now();

	// Base image
	const baseImage = client.images.fromRegistry("oven/bun:1.1-debian");

	// Custom Dockerfile commands
	const dockerCommands = [
		// Install system dependencies
		"RUN apt-get update && apt-get install -y git curl wget procps ripgrep unzip && rm -rf /var/lib/apt/lists/*",

		// Install GitHub CLI
		"RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && echo \"deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main\" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && apt-get update && apt-get install -y gh && rm -rf /var/lib/apt/lists/*",

		// Create workspace
		"RUN mkdir -p /root/workspace",
		"WORKDIR /root/workspace",

		// Install opencode using the official install script
		"RUN curl -fsSL https://opencode.ai/install | bash",

		// Add opencode to PATH
		// biome-ignore lint/suspicious/noTemplateCurlyInString: Dockerfile syntax, not JS template
		'ENV PATH="${PATH}:/root/.opencode/bin"',

		// Verify
		"RUN opencode --version",
	];

	// Build image
	const customImage = baseImage.dockerfileCommands(dockerCommands);
	const builtImage = await customImage.build(app);

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

	console.log(`\n✅ Image built successfully in ${elapsed}s!`);
	console.log(`\n${"=".repeat(60)}`);
	console.log("IMAGE ID (save this):");
	console.log("=".repeat(60));
	console.log(`\n${builtImage.imageId}\n`);
	console.log("=".repeat(60));
	console.log("\nAdd to your .env file:");
	console.log(`MODAL_IMAGE_ID=${builtImage.imageId}`);
}

main().catch((error) => {
	console.error("\n❌ Build failed:", error);
	process.exit(1);
});
