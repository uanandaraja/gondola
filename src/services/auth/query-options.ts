import { queryOptions } from "@tanstack/react-query";
import { getSession } from "./server";

export const sessionQueryOptions = queryOptions({
	queryKey: ["session"],
	queryFn: () => getSession(),
	staleTime: 5 * 60 * 1000,
});
