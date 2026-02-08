import { Effect } from "effect";
import { db } from "@/db";

export class DatabaseClient extends Effect.Service<DatabaseClient>()(
	"DatabaseClient",
	{
		effect: Effect.sync(() => db),
	},
) {}

export { db } from "@/db";
