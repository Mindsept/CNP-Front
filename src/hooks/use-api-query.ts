import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { ApiError } from "@/lib/errors";

export function useApiQuery<TData, TQueryKey extends QueryKey = QueryKey>(
  options: UseQueryOptions<TData, ApiError, TData, TQueryKey>,
): UseQueryResult<TData, ApiError> {
  return useQuery<TData, ApiError, TData, TQueryKey>(options);
}
