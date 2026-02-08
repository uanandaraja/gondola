import { Effect, Layer, Logger, LogLevel } from "effect";

/**
 * Application logger configuration.
 * Pretty logger for development, JSON logger for production.
 */

const isDev = process.env.NODE_ENV !== "production";

const appLogger = isDev
	? Logger.make(({ date, logLevel, message }) => {
			const timestamp = date.toISOString();
			const level = logLevel.label.padEnd(5);
			console.log(`[${timestamp}] ${level} ${message}`);
		})
	: Logger.make(({ date, logLevel, message }) => {
			console.log(
				JSON.stringify({
					timestamp: date.toISOString(),
					level: logLevel.label,
					message,
				}),
			);
		});

export const AppLoggerLive = Logger.replace(
	Logger.defaultLogger,
	appLogger,
).pipe(
	Layer.merge(Logger.minimumLogLevel(isDev ? LogLevel.Debug : LogLevel.Info)),
);
