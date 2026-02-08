// Security: Input Validation & Shell Escaping

/**
 * Validates GitHub URL format to prevent command injection.
 * Only allows https://github.com/* or git@github.com:* URLs.
 */
export function validateGitHubUrl(url: string): string {
	// Only allow alphanumeric, dashes, underscores, dots, slashes, colons in URLs
	const allowedPattern =
		/^(https:\/\/github\.com\/|git@github\.com:)[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\.git)?$/;
	if (!allowedPattern.test(url)) {
		throw new Error("Invalid GitHub URL format");
	}
	return url;
}

/**
 * Validates branch name to prevent command injection.
 * Branch names should only contain alphanumeric, dashes, underscores, dots, and slashes.
 */
export function validateBranchName(branch: string): string {
	// Branch names: alphanumeric, dashes, underscores, dots, forward slashes, @ for HEAD
	const allowedPattern = /^[a-zA-Z0-9_.@/:-]+$/;
	if (!allowedPattern.test(branch)) {
		throw new Error("Invalid branch name format");
	}
	return branch;
}

/**
 * Escapes a string for safe use in shell commands.
 * Wraps in single quotes and escapes any single quotes.
 */
export function shellEscape(str: string): string {
	if (!str) return "''";
	// Replace single quotes with '\'' to safely escape them
	return `'${str.replace(/'/g, "'\\''")}'`;
}
