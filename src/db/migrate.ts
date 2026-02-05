import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	console.error("DATABASE_URL environment variable is not set");
	process.exit(1);
}

const migrationClient = postgres(databaseUrl, { max: 1 });
const db = drizzle(migrationClient);

async function main() {
	console.log("Running migrations...");
	await migrate(db, { migrationsFolder: "./drizzle" });
	console.log("Migrations complete!");
	await migrationClient.end();
	process.exit(0);
}

main().catch((err) => {
	console.error("Migration failed:", err);
	process.exit(1);
});
