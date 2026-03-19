import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VolunteerStatus = "pendente" | "ativo" | "recusado";
export type VolunteerFilter = "todos" | "pendentes" | "aprovados" | "sem_celula" | "recusados";

export interface VolunteerWithCell {
  id: string;
  full_name: string | null;
  nickname: string | null;
  city: string | null;
  state: string | null;
  volunteer_status: VolunteerStatus;
  rejection_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  onboarding_status: string | null;
  interests: string[] | null;
  // Joined cell data
  cell_id: string | null;
  cell_name: string | null;
  cell_city: string | null;
  membership_status: string | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  nickname: string | null;
  city: string | null;
  state: string | null;
  volunteer_status: VolunteerStatus;
  rejection_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  onboarding_status: string | null;
  interests: string[] | null;
}

interface MembershipWithCell {
  user_id: string;
  cell_id: string;
  status: string | null;
  cells: {
    id: string;
    name: string;
    city: string;
  } | null;
}

export function useAdminVolunteers(filter: VolunteerFilter = "todos") {
  const queryClient = useQueryClient();

  // Get all volunteers with separate query for memberships
  const volunteersQuery = useQuery({
    queryKey: ["admin-volunteers-with-cells", filter],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          nickname,
          city,
          state,
          volunteer_status,
          rejection_reason,
          approved_at,
          approved_by,
          created_at,
          onboarding_status,
          interests
        `)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch active memberships with cells
      const { data: memberships, error: membershipsError } = await supabase
        .from("cell_memberships")
        .select(`
          user_id,
          cell_id,
          status,
          cells (
            id,
            name,
            city
          )
        `)
        .in("status", ["aprovado", "active", "approved"]);

      if (membershipsError) throw membershipsError;

      // Create a map of user_id -> membership
      const membershipMap = new Map<string, MembershipWithCell>();
      (memberships as MembershipWithCell[])?.forEach((m) => {
        membershipMap.set(m.user_id, m);
      });

      // Transform to flat structure
      const volunteers: VolunteerWithCell[] = (profiles as ProfileRow[]).map((row) => {
        const membership = membershipMap.get(row.id);
        
        return {
          id: row.id,
          full_name: row.full_name,
          nickname: row.nickname,
          city: row.city,
          state: row.state,
          volunteer_status: row.volunteer_status,
          rejection_reason: row.rejection_reason,
          approved_at: row.approved_at,
          approved_by: row.approved_by,
          created_at: row.created_at,
          onboarding_status: row.onboarding_status,
          interests: row.interests,
          cell_id: membership?.cell_id || null,
          cell_name: membership?.cells?.name || null,
          cell_city: membership?.cells?.city || null,
          membership_status: membership?.status || null,
        };
      });

      // Apply filter
      switch (filter) {
        case "pendentes":
          return volunteers.filter((v) => v.volunteer_status === "pendente");
        case "aprovados":
          return volunteers.filter((v) => v.volunteer_status === "ativo");
        case "sem_celula":
          return volunteers.filter(
            (v) => v.volunteer_status === "ativo" && !v.cell_id
          );
        case "recusados":
          return volunteers.filter((v) => v.volunteer_status === "recusado");
        default:
          return volunteers;
      }
    },
  });

  // Count pending volunteers
  const pendingCountQuery = useQuery({
    queryKey: ["pending-volunteers-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("volunteer_status", "pendente");

      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  // Count without cell
  const withoutCellCountQuery = useQuery({
    queryKey: ["volunteers-without-cell-count"],
    queryFn: async () => {
      // Get active volunteers
      const { data: activeVolunteers, error: volError } = await supabase
        .from("profiles")
        .select("id")
        .eq("volunteer_status", "ativo");

      if (volError) throw volError;

      if (!activeVolunteers?.length) return 0;

      // Get volunteers with active memberships
      const { data: memberships, error: memError } = await supabase
        .from("cell_memberships")
        .select("user_id")
        .in("status", ["aprovado", "active", "approved"]);

      if (memError) throw memError;

      const usersWithCell = new Set(memberships?.map((m) => m.user_id) || []);
      return activeVolunteers.filter((v) => !usersWithCell.has(v.id)).length;
    },
    refetchInterval: 30000,
  });

  // Approve volunteer mutation
  const approveMutation = useMutation({
    mutationFn: async ({ userId, cellId }: { userId: string; cellId?: string }) => {
      const { error } = await supabase.rpc("approve_volunteer", {
        _user_id: userId,
        _cell_id: cellId || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-volunteers-with-cells"] });
      queryClient.invalidateQueries({ queryKey: ["pending-volunteers-count"] });
      queryClient.invalidateQueries({ queryKey: ["volunteers-without-cell-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  // Reject volunteer mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase.rpc("reject_volunteer", {
        _user_id: userId,
        _reason: reason,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-volunteers-with-cells"] });
      queryClient.invalidateQueries({ queryKey: ["pending-volunteers-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  return {
    volunteers: volunteersQuery.data ?? [],
    isLoading: volunteersQuery.isLoading,
    pendingCount: pendingCountQuery.data ?? 0,
    withoutCellCount: withoutCellCountQuery.data ?? 0,
    approveVolunteer: approveMutation.mutateAsync,
    rejectVolunteer: rejectMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    refetch: volunteersQuery.refetch,
  };
}
