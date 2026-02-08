import { Layer } from "effect";
import { DatabaseClient } from "@/infra/db";
import { AppLoggerLive } from "./logger";
import { ProjectService } from "./projects/service";
import { SecretService } from "./secrets/service";
import { SessionService } from "./sessions/service";

export const MainLive = Layer.mergeAll(
	AppLoggerLive,
	DatabaseClient.Default,
	ProjectService.Default,
	SecretService.Default,
	SessionService.Default,
);

export { auth } from "./auth";
export { ProjectService } from "./projects/service";
export { SecretService } from "./secrets/service";
export { SessionService } from "./sessions/service";
