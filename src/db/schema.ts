import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const sandboxStatusEnum = pgEnum("sandbox_status", [
	"creating",
	"running",
	"error",
	"terminated",
]);

export const sandboxes = pgTable("sandboxes", {
	id: uuid("id").primaryKey().defaultRandom(),
	modalSandboxId: text("modal_sandbox_id").notNull(),
	gitUrl: text("git_url").notNull(),
	branch: text("branch"),
	opencodeUrl: text("opencode_url").notNull(),
	status: sandboxStatusEnum("status").notNull().default("creating"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type SandboxRecord = typeof sandboxes.$inferSelect;
export type NewSandboxRecord = typeof sandboxes.$inferInsert;
