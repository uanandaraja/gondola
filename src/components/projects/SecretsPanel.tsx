import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { ProjectSecretRecord } from "../../db/schema";

type SecretListItem = Pick<
	ProjectSecretRecord,
	"id" | "key" | "createdAt" | "updatedAt"
>;

import { parseEnvString } from "@/lib/parse-env";
import {
	addProjectSecret,
	fetchDecryptedSecrets,
	removeProjectSecret,
	replaceProjectSecrets,
	updateProjectSecret,
} from "../../server/functions";

interface SecretsPanelProps {
	projectId: string;
	secrets: SecretListItem[];
}

export function SecretsPanel({ projectId, secrets }: SecretsPanelProps) {
	const router = useRouter();
	const [showSecretForm, setShowSecretForm] = useState(false);
	const [showBulkForm, setShowBulkForm] = useState(false);
	const [secretKey, setSecretKey] = useState("");
	const [secretValue, setSecretValue] = useState("");
	const [bulkEnv, setBulkEnv] = useState("");
	const [bulkError, setBulkError] = useState("");
	const [editingSecretId, setEditingSecretId] = useState<string | null>(null);
	const [editValue, setEditValue] = useState("");

	const addSecretMutation = useMutation({
		mutationFn: (data: { key: string; value: string }) =>
			addProjectSecret({
				data: { projectId, ...data },
			}),
		onSuccess: () => {
			setSecretKey("");
			setSecretValue("");
			setShowSecretForm(false);
			router.invalidate();
		},
	});

	const removeSecretMutation = useMutation({
		mutationFn: (secretId: string) =>
			removeProjectSecret({
				data: { projectId, secretId },
			}),
		onSuccess: () => router.invalidate(),
	});

	const updateSecretMutation = useMutation({
		mutationFn: (data: { secretId: string; value: string }) =>
			updateProjectSecret({
				data: { projectId, ...data },
			}),
		onSuccess: () => {
			setEditingSecretId(null);
			setEditValue("");
			router.invalidate();
		},
	});

	const bulkAddMutation = useMutation({
		mutationFn: (entries: { key: string; value: string }[]) =>
			replaceProjectSecrets({
				data: { projectId, entries },
			}),
		onSuccess: () => {
			setBulkEnv("");
			setBulkError("");
			setShowBulkForm(false);
			router.invalidate();
		},
	});

	const handleAddSecret = (e: React.FormEvent) => {
		e.preventDefault();
		if (!secretKey.trim() || !secretValue.trim()) return;
		addSecretMutation.mutate({ key: secretKey, value: secretValue });
	};

	const handleBulkAdd = (e: React.FormEvent) => {
		e.preventDefault();
		const result = parseEnvString(bulkEnv);

		if (!result.ok) {
			setBulkError(result.error);
			return;
		}

		setBulkError("");
		bulkAddMutation.mutate(result.entries);
	};

	const handleToggleBulkForm = async () => {
		if (showBulkForm) {
			setShowBulkForm(false);
		} else {
			setShowSecretForm(false);
			if (secrets.length > 0) {
				const decrypted = await fetchDecryptedSecrets({
					data: projectId,
				});
				const envStr = Object.entries(decrypted)
					.map(([k, v]) => `${k}=${v}`)
					.join("\n");
				setBulkEnv(envStr);
			} else {
				setBulkEnv("");
			}
			setBulkError("");
			setShowBulkForm(true);
		}
	};

	const handleToggleSecretForm = () => {
		setShowSecretForm(!showSecretForm);
		if (!showSecretForm) setShowBulkForm(false);
	};

	const handleEditClick = async (secret: SecretListItem) => {
		const decrypted = await fetchDecryptedSecrets({
			data: projectId,
		});
		setEditValue(decrypted[secret.key] ?? "");
		setEditingSecretId(secret.id);
	};

	const handleUpdateSubmit = (e: React.FormEvent, secretId: string) => {
		e.preventDefault();
		updateSecretMutation.mutate({ secretId, value: editValue });
	};

	const detectedEntriesCount = bulkEnv
		.split("\n")
		.filter((l) => l.trim() && !l.trim().startsWith("#")).length;

	return (
		<div className="bg-bg-secondary border border-border-light shadow-sm mb-8">
			<div className="px-4 sm:px-6 py-4 border-b border-border-light flex items-center justify-end">
				<div className="flex items-center gap-2 w-full sm:w-auto">
					<button
						type="button"
						onClick={handleToggleBulkForm}
						className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold font-mono uppercase tracking-wide border border-accent text-accent hover:bg-accent hover:text-bg-secondary transition-colors duration-150"
					>
						{showBulkForm ? "CANCEL" : "PASTE .ENV"}
					</button>
					<button
						type="button"
						onClick={handleToggleSecretForm}
						className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold font-mono uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover transition-colors duration-150"
					>
						{showSecretForm ? "CANCEL" : "ADD SECRET"}
					</button>
				</div>
			</div>

			{showSecretForm && (
				<div className="px-6 py-5 border-b border-border-light">
					<form onSubmit={handleAddSecret} className="flex gap-3 items-end">
						<div className="flex-1">
							<label className="block mb-1.5 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary">
								Key
							</label>
							<input
								type="text"
								value={secretKey}
								onChange={(e) => setSecretKey(e.target.value.toUpperCase())}
								placeholder="DATABASE_URL"
								className="w-full px-3 py-2 text-sm border border-border-light bg-bg-secondary text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-150"
								required
							/>
						</div>
						<div className="flex-1">
							<label className="block mb-1.5 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary">
								Value
							</label>
							<input
								type="password"
								value={secretValue}
								onChange={(e) => setSecretValue(e.target.value)}
								placeholder="secret-value"
								className="w-full px-3 py-2 text-sm border border-border-light bg-bg-secondary text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-150"
								required
							/>
						</div>
						<button
							type="submit"
							disabled={addSecretMutation.isPending}
							className="px-4 py-2 text-sm font-semibold font-mono uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover disabled:opacity-50 transition-colors duration-150"
						>
							{addSecretMutation.isPending ? "..." : "ADD"}
						</button>
					</form>
				</div>
			)}

			{showBulkForm && (
				<div className="px-6 py-5 border-b border-border-light">
					<form onSubmit={handleBulkAdd} className="flex flex-col gap-3">
						<label className="block text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary">
							Paste .env contents
						</label>
						<textarea
							value={bulkEnv}
							onChange={(e) => {
								setBulkEnv(e.target.value);
								setBulkError("");
							}}
							placeholder={
								"DATABASE_URL=postgres://...\nAPI_KEY=sk-...\n# Comments are ignored"
							}
							rows={8}
							className="w-full px-3 py-2 text-sm border border-border-light bg-bg-secondary text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-150 resize-y"
							required
						/>
						{bulkError && (
							<p className="text-xs text-error font-mono">{bulkError}</p>
						)}
						<div className="flex items-center justify-between">
							<p className="text-xs text-text-muted">
								{detectedEntriesCount} entries detected
							</p>
							<button
								type="submit"
								disabled={bulkAddMutation.isPending}
								className="px-4 py-2 text-sm font-semibold font-mono uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover disabled:opacity-50 transition-colors duration-150"
							>
								{bulkAddMutation.isPending ? "ADDING..." : "ADD ALL"}
							</button>
						</div>
					</form>
				</div>
			)}

			{secrets.length === 0 ? (
				<div className="px-6 py-8 text-center text-text-muted text-sm">
					No environment variables configured.
				</div>
			) : (
				<div>
					{secrets.map((secret) => (
						<div
							key={secret.id}
							className="px-4 sm:px-6 py-3 border-b border-border-light last:border-b-0"
						>
							{editingSecretId === secret.id ? (
								<form
									onSubmit={(e) => handleUpdateSubmit(e, secret.id)}
									className="flex flex-col gap-1"
								>
									<div className="flex items-center justify-between">
										<span className="font-mono text-sm truncate">
											{secret.key}
										</span>
										<div className="flex items-center gap-3">
											<button
												type="submit"
												disabled={updateSecretMutation.isPending}
												className="text-accent hover:text-accent-hover text-sm font-semibold transition-colors duration-150"
											>
												{updateSecretMutation.isPending ? "..." : "Save"}
											</button>
											<button
												type="button"
												onClick={() => setEditingSecretId(null)}
												className="text-text-muted hover:text-text-secondary text-sm transition-colors duration-150"
											>
												Cancel
											</button>
										</div>
									</div>
									<input
										type="text"
										value={editValue}
										onChange={(e) => setEditValue(e.target.value)}
										className="w-full px-3 py-1.5 text-sm border border-border-light bg-bg-secondary text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-150"
									/>
								</form>
							) : (
								<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
									<div className="flex items-center justify-between">
										<span className="font-mono text-sm truncate">
											{secret.key}
										</span>
										<div className="flex items-center gap-3 sm:hidden">
											<button
												type="button"
												onClick={() => handleEditClick(secret)}
												className="text-text-secondary hover:text-text text-sm transition-colors duration-150"
											>
												Edit
											</button>
											<button
												type="button"
												onClick={() => removeSecretMutation.mutate(secret.id)}
												className="text-error/70 hover:text-error text-sm transition-colors duration-150"
											>
												Remove
											</button>
										</div>
									</div>
									<span className="text-text-muted text-sm font-mono">
										••••••••
									</span>
									<div className="hidden sm:flex items-center gap-3">
										<button
											type="button"
											onClick={() => handleEditClick(secret)}
											className="text-text-secondary hover:text-text text-sm transition-colors duration-150"
										>
											Edit
										</button>
										<button
											type="button"
											onClick={() => removeSecretMutation.mutate(secret.id)}
											className="text-error/70 hover:text-error text-sm transition-colors duration-150"
										>
											Remove
										</button>
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
