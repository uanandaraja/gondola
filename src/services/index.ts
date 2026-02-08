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
export { ProjectService } from "./projects";
export { SecretService } from "./secrets";
export { SessionService } from "./sessions";
