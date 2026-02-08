import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { ModalClient } from "modal";
import type { SessionRecord } from "@/db/schema";
import * as schema from "@/db/schema";
import { DatabaseClient } from "@/infra/db";
import { ConfigError, DatabaseError } from "@/services/errors";
import { ProjectService } from "@/services/projects";
import { ProjectNotFoundError } from "@/services/projects/errors";
import { SecretService } from "@/services/secrets";
import { configureGitAuth, getGitHubAccount, getUserInfo } from "./auth";
import { MODAL_APP_NAME, SANDBOX_TIMEOUT_MS } from "./constants";
import {
	NoSnapshotError,
	SandboxCreationError,
	SessionNotFoundError,
	TunnelError,
} from "./errors";
import { handleSessionDeath } from "./health";
import {
	setupSandboxFromScratch,
	startOpencodeServer,
	writeSecretsEnvFile,
} from "./sandbox";
import { startSnapshotScheduler, takeSnapshot } from "./snapshots";
import { activeSessions } from "./state";

export class SessionService extends Effect.Service<SessionService>()(
	"SessionService",
	{
		dependencies: [
			DatabaseClient.Default,
			ProjectService.Default,
			SecretService.Default,
		],
		effect: Effect.gen(function* () {
			const db = yield* DatabaseClient;
			const projectService = yield* ProjectService;
			const secretService = yield* SecretService;

			const createSession = (projectId: string, userId: string) =>
				Effect.gen(function* () {
					// Verify project ownership
					const project = yield* projectService.findById(projectId, userId);

					const sessionId = crypto.randomUUID();
					console.log(
						`[${sessionId}] Creating session for project ${project.name}...`,
					);

					const client = new ModalClient();
					const app = yield* Effect.tryPromise({
						try: () =>
							client.apps.fromName(MODAL_APP_NAME, {
								createIfMissing: true,
							}),
						catch: (e) =>
							new SandboxCreationError({
								message: "Failed to get/create Modal app",
								cause: e,
							}),
					});

					const imageId = process.env.MODAL_IMAGE_ID;
					if (!imageId) {
						return yield* new ConfigError({
							key: "MODAL_IMAGE_ID",
							message:
								"MODAL_IMAGE_ID not set. Run: bun run scripts/build-image.ts",
						});
					}

					const image = yield* Effect.tryPromise({
						try: () => client.images.fromId(imageId),
						catch: (e) =>
							new SandboxCreationError({
								message: "Failed to load Modal image",
								cause: e,
							}),
					});

					// Load secrets
					const kimiSecret = yield* Effect.tryPromise({
						try: () => client.secrets.fromName("kimi-api-key"),
						catch: (e) =>
							new SandboxCreationError({
								message: "Failed to load kimi-api-key secret",
								cause: e,
							}),
					});

					const projectSecrets =
						yield* secretService.getDecryptedSecrets(projectId);
					const secrets = [kimiSecret];

					if (Object.keys(projectSecrets).length > 0) {
						const projectModalSecret = yield* Effect.tryPromise({
							try: () => client.secrets.fromObject(projectSecrets),
							catch: (e) =>
								new SandboxCreationError({
									message: "Failed to create project secrets",
									cause: e,
								}),
						});
						secrets.push(projectModalSecret);
					}

					// Fetch GitHub token
					const ghAccount = yield* getGitHubAccount(userId);
					const userInfo = yield* getUserInfo(userId);

					if (ghAccount?.accessToken) {
						const accessToken = ghAccount.accessToken;
						const ghSecret = yield* Effect.tryPromise({
							try: () =>
								client.secrets.fromObject({
									GITHUB_TOKEN: accessToken,
								}),
							catch: (e) =>
								new SandboxCreationError({
									message: "Failed to create GitHub secret",
									cause: e,
								}),
						});
						secrets.push(ghSecret);
					}

					// Create sandbox with cleanup on error
					const sandbox = yield* Effect.tryPromise({
						try: () =>
							client.sandboxes.create(app, image, {
								timeoutMs: SANDBOX_TIMEOUT_MS,
								idleTimeoutMs: SANDBOX_TIMEOUT_MS,
								encryptedPorts: [4096],
								secrets,
							}),
						catch: (e) =>
							new SandboxCreationError({
								message: "Failed to create Modal sandbox",
								cause: e,
							}),
					}).pipe(
						Effect.tapError((error) =>
							Effect.sync(() => {
								console.error(`[${sessionId}] Session creation failed:`, error);
							}),
						),
					);

					console.log(`[${sessionId}] Sandbox created: ${sandbox.sandboxId}`);

					// Setup sandbox from scratch
					yield* setupSandboxFromScratch(
						sandbox,
						sessionId,
						project.githubUrl,
						project.branch,
					);

					// Configure git auth
					if (ghAccount?.accessToken && userInfo) {
						yield* configureGitAuth(
							sandbox,
							sessionId,
							ghAccount.accessToken,
							userInfo.name,
							userInfo.email,
						);
					}

					// Write secrets
					yield* writeSecretsEnvFile(sandbox, sessionId, projectSecrets);

					// Start opencode
					yield* startOpencodeServer(sandbox, sessionId);

					// Get tunnel URL
					const tunnels = yield* Effect.tryPromise({
						try: () => sandbox.tunnels(),
						catch: (e) =>
							new TunnelError({
								message: "Failed to get sandbox tunnels",
							}),
					});
					const opencodeUrl = tunnels[4096]?.url;
					if (!opencodeUrl) {
						return yield* new TunnelError({
							message: "Failed to get opencode tunnel URL",
						});
					}
					console.log(`[${sessionId}] Opencode URL: ${opencodeUrl}`);

					// Insert session record
					const [inserted] = yield* Effect.tryPromise({
						try: () =>
							db
								.insert(schema.sessions)
								.values({
									id: sessionId,
									projectId,
									modalSandboxId: sandbox.sandboxId,
									opencodeUrl,
									status: "running",
								})
								.returning(),
						catch: (e) => new DatabaseError({ cause: e }),
					});

					// Start snapshot scheduler and track
					const snapshotInterval = startSnapshotScheduler(sessionId);
					activeSessions.set(sessionId, { sandbox, snapshotInterval });

					// Take initial snapshot (fire and forget)
					yield* Effect.fork(Effect.ignore(takeSnapshot(sessionId)));

					return inserted;
				});

			const resumeSession = (sessionId: string, userId: string) =>
				Effect.gen(function* () {
					// Load session row
					const sessionRows = yield* Effect.tryPromise({
						try: () =>
							db
								.select()
								.from(schema.sessions)
								.where(eq(schema.sessions.id, sessionId))
								.limit(1),
						catch: (e) => new DatabaseError({ cause: e }),
					});
					const sessionRow = sessionRows[0];
					if (!sessionRow) {
						return yield* new SessionNotFoundError({ sessionId });
					}

					// Verify ownership
					yield* projectService.findById(sessionRow.projectId, userId);

					if (!sessionRow.latestSnapshotImageId) {
						return yield* new NoSnapshotError({ sessionId });
					}

					console.log(
						`[${sessionId}] Resuming from snapshot ${sessionRow.latestSnapshotImageId}...`,
					);

					const client = new ModalClient();
					const app = yield* Effect.tryPromise({
						try: () =>
							client.apps.fromName(MODAL_APP_NAME, {
								createIfMissing: true,
							}),
						catch: (e) =>
							new SandboxCreationError({
								message: "Failed to get/create Modal app",
								cause: e,
							}),
					});

					const snapshotImage = yield* Effect.tryPromise({
						try: () => client.images.fromId(sessionRow.latestSnapshotImageId!),
						catch: (e) =>
							new SandboxCreationError({
								message: "Failed to load snapshot image",
								cause: e,
							}),
					});

					const kimiSecret = yield* Effect.tryPromise({
						try: () => client.secrets.fromName("kimi-api-key"),
						catch: (e) =>
							new SandboxCreationError({
								message: "Failed to load kimi-api-key secret",
								cause: e,
							}),
					});

					const projectSecrets = yield* secretService.getDecryptedSecrets(
						sessionRow.projectId,
					);
					const secrets = [kimiSecret];

					if (Object.keys(projectSecrets).length > 0) {
						const projectModalSecret = yield* Effect.tryPromise({
							try: () => client.secrets.fromObject(projectSecrets),
							catch: (e) =>
								new SandboxCreationError({
									message: "Failed to create project secrets",
									cause: e,
								}),
						});
						secrets.push(projectModalSecret);
					}

					const ghAccount = yield* getGitHubAccount(userId);
					const userInfo = yield* getUserInfo(userId);

					if (ghAccount?.accessToken) {
						const accessToken = ghAccount.accessToken;
						const ghSecret = yield* Effect.tryPromise({
							try: () =>
								client.secrets.fromObject({
									GITHUB_TOKEN: accessToken,
								}),
							catch: (e) =>
								new SandboxCreationError({
									message: "Failed to create GitHub secret",
									cause: e,
								}),
						});
						secrets.push(ghSecret);
					}

					const sandbox = yield* Effect.tryPromise({
						try: () =>
							client.sandboxes.create(app, snapshotImage, {
								timeoutMs: SANDBOX_TIMEOUT_MS,
								idleTimeoutMs: SANDBOX_TIMEOUT_MS,
								encryptedPorts: [4096],
								secrets,
							}),
						catch: (e) =>
							new SandboxCreationError({
								message: "Failed to create sandbox from snapshot",
								cause: e,
							}),
					});
					console.log(`[${sessionId}] Sandbox restored: ${sandbox.sandboxId}`);

					// Configure git auth
					if (ghAccount?.accessToken && userInfo) {
						yield* configureGitAuth(
							sandbox,
							sessionId,
							ghAccount.accessToken,
							userInfo.name,
							userInfo.email,
						);
					}

					yield* writeSecretsEnvFile(sandbox, sessionId, projectSecrets);
					yield* startOpencodeServer(sandbox, sessionId);

					const tunnels = yield* Effect.tryPromise({
						try: () => sandbox.tunnels(),
						catch: (e) =>
							new TunnelError({ message: "Failed to get sandbox tunnels" }),
					});
					const opencodeUrl = tunnels[4096]?.url;
					if (!opencodeUrl) {
						return yield* new TunnelError({
							message: "Failed to get opencode tunnel URL after resume",
						});
					}
					console.log(`[${sessionId}] Resumed. Opencode URL: ${opencodeUrl}`);

					const [updated] = yield* Effect.tryPromise({
						try: () =>
							db
								.update(schema.sessions)
								.set({
									modalSandboxId: sandbox.sandboxId,
									opencodeUrl,
									status: "running",
									updatedAt: new Date(),
								})
								.where(eq(schema.sessions.id, sessionId))
								.returning(),
						catch: (e) => new DatabaseError({ cause: e }),
					});

					const snapshotInterval = startSnapshotScheduler(sessionId);
					activeSessions.set(sessionId, { sandbox, snapshotInterval });

					return updated;
				});

			const terminateSession = (sessionId: string, userId: string) =>
				Effect.gen(function* () {
					const sessionRows = yield* Effect.tryPromise({
						try: () =>
							db
								.select()
								.from(schema.sessions)
								.where(eq(schema.sessions.id, sessionId))
								.limit(1),
						catch: (e) => new DatabaseError({ cause: e }),
					});
					const sessionRow = sessionRows[0];
					if (!sessionRow) {
						return yield* new SessionNotFoundError({ sessionId });
					}

					yield* projectService.findById(sessionRow.projectId, userId);

					const active = activeSessions.get(sessionId);
					if (active) {
						// Take final snapshot
						yield* Effect.ignore(takeSnapshot(sessionId));

						clearInterval(active.snapshotInterval);

						yield* Effect.tryPromise({
							try: () => active.sandbox.terminate(),
							catch: (e) =>
								Effect.sync(() =>
									console.error(`[${sessionId}] Error terminating sandbox:`, e),
								),
						});

						activeSessions.delete(sessionId);
					} else if (sessionRow.modalSandboxId) {
						console.log(
							`[${sessionId}] Session not in memory, terminating via Modal API...`,
						);
						yield* Effect.try({
							try: async () => {
								const client = new ModalClient();
								const sandbox = await client.sandboxes.fromId(
									sessionRow.modalSandboxId!,
								);
								await sandbox.terminate();
								console.log(`[${sessionId}] Sandbox terminated via Modal API`);
							},
							catch: () => {
								// Sandbox might already be terminated
							},
						});
					}

					yield* Effect.tryPromise({
						try: () =>
							db
								.update(schema.sessions)
								.set({
									status: "terminated",
									modalSandboxId: null,
									opencodeUrl: null,
									updatedAt: new Date(),
								})
								.where(eq(schema.sessions.id, sessionId)),
						catch: (e) => new DatabaseError({ cause: e }),
					});

					console.log(`[${sessionId}] Session terminated`);
				});

			const getSessionById = (sessionId: string, userId: string) =>
				Effect.gen(function* () {
					const rows = yield* Effect.tryPromise({
						try: () =>
							db
								.select()
								.from(schema.sessions)
								.where(eq(schema.sessions.id, sessionId))
								.limit(1),
						catch: (e) => new DatabaseError({ cause: e }),
					});
					const row = rows[0];
					if (!row) return undefined;

					// Verify ownership
					yield* Effect.ignore(projectService.findById(row.projectId, userId));

					// Check if sandbox is actually alive
					if (row.status === "running") {
						const active = activeSessions.get(sessionId);
						if (active) {
							const exitCode = yield* Effect.tryPromise({
								try: () => active.sandbox.poll(),
								catch: () => null,
							});
							if (exitCode !== null) {
								yield* handleSessionDeath(sessionId);
								const updated = yield* Effect.tryPromise({
									try: () =>
										db
											.select()
											.from(schema.sessions)
											.where(eq(schema.sessions.id, sessionId))
											.limit(1),
									catch: (e) => new DatabaseError({ cause: e }),
								});
								return updated[0];
							}
						}
					}

					return row;
				});

			const listSessions = (projectId: string, userId: string) =>
				Effect.gen(function* () {
					yield* projectService.findById(projectId, userId);

					return yield* Effect.tryPromise({
						try: () =>
							db
								.select()
								.from(schema.sessions)
								.where(eq(schema.sessions.projectId, projectId)),
						catch: (e) => new DatabaseError({ cause: e }),
					});
				});

			return {
				createSession,
				resumeSession,
				terminateSession,
				getSessionById,
				listSessions,
			};
		}),
	},
) {}
