import "dotenv/config";
import { Hono } from "hono";
import { z } from "zod";
import { createSandbox, getSandbox, deleteSandbox, listSandboxes } from "./sandbox";

const app = new Hono();

// Validation schemas
const createSchema = z.object({
  gitUrl: z.string().url(),
  branch: z.string().optional(),
});

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// List all sandboxes
app.get("/api/sandbox", (c) => {
  const sandboxes = listSandboxes();
  return c.json({ sandboxes });
});

// Create new sandbox
app.post("/api/sandbox", async (c) => {
  try {
    const body = await c.req.json();
    const result = createSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: "Invalid request", details: result.error.errors }, 400);
    }

    const { gitUrl, branch } = result.data;
    
    console.log(`\n🚀 Creating sandbox for: ${gitUrl}`);
    const sandbox = await createSandbox(gitUrl, branch);
    
    console.log(`✅ Sandbox ready: ${sandbox.opencodeUrl}\n`);
    
    return c.json({
      id: sandbox.id,
      status: sandbox.status,
      opencodeUrl: sandbox.opencodeUrl,
      gitUrl: sandbox.gitUrl,
      branch: sandbox.branch,
      createdAt: sandbox.createdAt,
    }, 201);

  } catch (error) {
    console.error("❌ Failed to create sandbox:", error);
    return c.json({ 
      error: "Failed to create sandbox",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get sandbox info
app.get("/api/sandbox/:id", (c) => {
  const id = c.req.param("id");
  const sandbox = getSandbox(id);

  if (!sandbox) {
    return c.json({ error: "Sandbox not found" }, 404);
  }

  return c.json({
    id: sandbox.id,
    status: sandbox.status,
    opencodeUrl: sandbox.opencodeUrl,
    gitUrl: sandbox.gitUrl,
    branch: sandbox.branch,
    createdAt: sandbox.createdAt,
  });
});

// Delete sandbox
app.delete("/api/sandbox/:id", async (c) => {
  const id = c.req.param("id");
  const sandbox = getSandbox(id);

  if (!sandbox) {
    return c.json({ error: "Sandbox not found" }, 404);
  }

  await deleteSandbox(id);
  return c.body(null, 204);
});

// Default port
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

console.log("\n🎯 Gondola API starting...");
console.log(`   Port: ${port}`);
console.log("   Endpoints:");
console.log("     GET  /health");
console.log("     GET  /api/sandbox");
console.log("     POST /api/sandbox");
console.log("     GET  /api/sandbox/:id");
console.log("     DELETE /api/sandbox/:id");
console.log("\n📝 Create a sandbox:");
console.log('   curl -X POST http://localhost:' + port + '/api/sandbox \\');
console.log('     -H "Content-Type: application/json" \\');
console.log('     -d \'{"gitUrl": "https://github.com/user/repo.git"}\'\n');

export default {
  port,
  fetch: app.fetch,
};
