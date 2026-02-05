CREATE TYPE "public"."sandbox_status" AS ENUM('creating', 'running', 'error', 'terminated');--> statement-breakpoint
CREATE TABLE "sandboxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modal_sandbox_id" text NOT NULL,
	"git_url" text NOT NULL,
	"branch" text,
	"opencode_url" text NOT NULL,
	"status" "sandbox_status" DEFAULT 'creating' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
