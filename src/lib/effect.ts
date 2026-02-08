import { Effect, type Layer } from "effect";
import { MainLive } from "@/services";

// Extract the services provided by MainLive
type MainServices = Layer.Layer.Success<typeof MainLive>;

/**
 * Runs an Effect program with the main application layer.
 * Use this in server functions to execute Effect-based services.
 */
export const runService = <A, E>(
	program: Effect.Effect<A, E, MainServices>,
): Promise<A> => Effect.runPromise(program.pipe(Effect.provide(MainLive)));

/**
 * Runs an Effect program and returns an Exit, allowing you to inspect errors.
 */
export const runServiceExit = <A, E>(
	program: Effect.Effect<A, E, MainServices>,
) => Effect.runPromiseExit(program.pipe(Effect.provide(MainLive)));
