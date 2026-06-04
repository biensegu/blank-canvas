import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const { data, isFetching, isSuccess } = useQuery({
    queryKey: ["user-role", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });
  const roles = (data ?? []).map((r) => r.role as string);
  const loading = authLoading || (!!user && !isSuccess && isFetching) || (!!user && data === undefined);
  return { roles, isAdmin: roles.includes("admin"), loading };
}