import { Data } from "effect";

export class ProjectNotFoundError extends Data.TaggedError(
	"ProjectNotFoundError",
)<{
	readonly projectId: string;
}> {
	get message() {
		return `Project with id ${this.projectId} not found`;
	}
}

export class ProjectValidationError extends Data.TaggedError(
	"ProjectValidationError",
)<{
	readonly field: string;
	readonly message: string;
}> {}
