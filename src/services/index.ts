import { Layer } from "effect";
import { DatabaseClient } from "@/infra/db";
import { AppLoggerLive } from "./logger";
import { ProjectService } from "./projects/service";
import { SecretService } from "./secrets/service";

export const MainLive = Layer.mergeAll(
	AppLoggerLive,
	DatabaseClient.Default,
	ProjectService.Default,
	SecretService.Default,
);

export { auth } from "./auth";
export { ProjectService } from "./projects";
export { SecretService } from "./secrets";
