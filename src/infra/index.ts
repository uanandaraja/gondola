import { Layer } from "effect";
import { DatabaseClient } from "./db";

/**
 * Infrastructure layer composition.
 */
export const InfraLive = Layer.mergeAll(DatabaseClient.Default);
