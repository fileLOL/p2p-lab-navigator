import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getOverview } from "@/lib/api.functions";

export function useOverview(enabled = true) {
  const fn = useServerFn(getOverview);
  return useQuery({
    queryKey: ["overview"],
    queryFn: () => fn(),
    enabled,
    staleTime: 15_000,
  });
}

export function useInvalidateOverview() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["overview"] });
    void queryClient.invalidateQueries({ queryKey: ["trades"] });
  };
}
