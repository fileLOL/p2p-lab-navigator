import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getRealOverview } from "@/lib/api.functions";

export function useRealOverview(enabled = true) {
  const fn = useServerFn(getRealOverview);
  return useQuery({ queryKey: ["real-overview"], queryFn: () => fn(), enabled });
}
