import type { sessionStatusEnum } from "../db/schema";

export type SessionStatus = (typeof sessionStatusEnum.enumValues)[number];

export const SESSION_STATUS_ORDER: Record<SessionStatus, number> = {
	running: 0,
	creating: 1,
	snapshotting: 2,
	suspended: 3,
	error: 4,
	terminated: 5,
};

export function getStatusBadgeClass(status: SessionStatus | string): string {
	switch (status) {
		case "running":
			return "bg-success/10 text-success border-success/30";
		case "creating":
		case "snapshotting":
			return "bg-warning/10 text-warning border-warning/30";
		case "suspended":
			return "bg-blue-500/10 text-blue-500 border-blue-500/30";
		case "error":
			return "bg-error/10 text-error border-error/30";
		case "terminated":
			return "bg-bg-tertiary text-text-muted border-border-light";
		default:
			return "bg-bg-tertiary text-text-muted border-border-light";
	}
}

export function compareSessionStatus(
	a: SessionStatus | string,
	b: SessionStatus | string,
): number {
	const orderA = SESSION_STATUS_ORDER[a as SessionStatus] ?? 9;
	const orderB = SESSION_STATUS_ORDER[b as SessionStatus] ?? 9;
	return orderA - orderB;
}

export function sortSessionsByStatus<
	T extends { status: SessionStatus | string },
>(sessions: T[]): T[] {
	return [...sessions].sort((a, b) => compareSessionStatus(a.status, b.status));
}
