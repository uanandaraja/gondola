export type ParseResult =
	| { ok: true; entries: { key: string; value: string }[] }
	| { ok: false; error: string };

export function parseEnvString(envContent: string): ParseResult {
	const lines = envContent
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l && !l.startsWith("#"));

	const entries: { key: string; value: string }[] = [];

	for (const line of lines) {
		const eqIdx = line.indexOf("=");
		if (eqIdx === -1) {
			return { ok: false, error: `Invalid line (no = sign): ${line}` };
		}

		const key = line.slice(0, eqIdx).trim();
		let value = line.slice(eqIdx + 1).trim();

		// Strip surrounding quotes
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		if (!key) {
			return { ok: false, error: `Invalid line (empty key): ${line}` };
		}

		entries.push({ key, value });
	}

	if (entries.length === 0) {
		return { ok: false, error: "No valid entries found" };
	}

	return { ok: true, entries };
}
