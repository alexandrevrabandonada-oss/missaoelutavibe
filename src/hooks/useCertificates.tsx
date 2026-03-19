import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useLogGrowthEvent } from "./useGrowth";
import { toast } from "sonner";

export interface FormacaoCertificate {
  id: string;
  user_id: string;
  curso_id: string;
  issued_at: string;
  certificate_code: string;
  public_enabled?: boolean;
  public_visibility?: "full" | "initials" | "anon";
  revoked_at?: string | null;
  og_image_url?: string | null;
}

export interface PublicCertificateData {
  ok: boolean;
  status: "valid" | "private" | "revoked" | "not_found";
  course_title?: string;
  course_level?: string;
  issued_at?: string;
  display_name?: string;
  og_image_url?: string;
}

export function useCertificates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const logEvent = useLogGrowthEvent();

  // Fetch all user certificates
  const {
    data: certificates = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["formacao_certificates", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("formacao_certificates")
        .select("*")
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });

      if (error) throw error;
      return (data || []) as FormacaoCertificate[];
    },
    enabled: !!user,
  });

  // Get certificate for a specific course
  const getCertificateForCourse = (cursoId: string): FormacaoCertificate | undefined => {
    return certificates.find((c) => c.curso_id === cursoId);
  };

  // Issue a new certificate
  const issueCertificate = useMutation({
    mutationFn: async (cursoId: string) => {
      if (!user) throw new Error("Não autenticado");

      // Check if certificate already exists
      const existing = getCertificateForCourse(cursoId);
      if (existing) {
        return existing;
      }

      const { data, error } = await supabase
        .from("formacao_certificates")
        .insert({
          user_id: user.id,
          curso_id: cursoId,
        })
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation gracefully
        if (error.code === "23505") {
          // Certificate already exists, fetch it
          const { data: existingCert } = await supabase
            .from("formacao_certificates")
            .select("*")
            .eq("user_id", user.id)
            .eq("curso_id", cursoId)
            .single();
          return existingCert as FormacaoCertificate;
        }
        throw error;
      }

      return data as FormacaoCertificate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formacao_certificates"] });
    },
    onError: (error: Error) => {
      console.error("Erro ao emitir certificado:", error);
      toast.error("Erro ao emitir certificado");
    },
  });

  // Set certificate privacy
  const setPrivacy = useMutation({
    mutationFn: async ({
      certificateId,
      publicEnabled,
      visibility,
    }: {
      certificateId: string;
      publicEnabled: boolean;
      visibility: "full" | "initials" | "anon";
    }) => {
      const { data, error } = await supabase.rpc("set_certificate_privacy", {
        _certificate_id: certificateId,
        _public_enabled: publicEnabled,
        _visibility: visibility,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formacao_certificates"] });
      toast.success("Privacidade atualizada");
    },
    onError: (error: Error) => {
      console.error("Erro ao atualizar privacidade:", error);
      toast.error("Erro ao atualizar privacidade");
    },
  });

  // Track certificate viewed event
  const trackCertificateViewed = (cursoId: string, certificateCode: string) => {
    logEvent.mutate({
      eventType: "certificate_viewed",
      meta: { curso_id: cursoId, certificate_code: certificateCode },
    });
  };

  // Track certificate shared event
  const trackCertificateShared = (cursoId: string, certificateCode: string, shareMethod: string) => {
    logEvent.mutate({
      eventType: "certificate_shared",
      meta: { 
        curso_id: cursoId, 
        certificate_code: certificateCode,
        share_method: shareMethod,
      },
    });
  };

  // Track post-course mission started
  const trackPostCourseMissionStarted = (cursoId: string, missionType: string) => {
    logEvent.mutate({
      eventType: "post_course_mission_started",
      meta: { curso_id: cursoId, mission_type: missionType },
    });
  };

  // Track post-course mission completed
  const trackPostCourseMissionCompleted = (cursoId: string, missionId: string) => {
    logEvent.mutate({
      eventType: "post_course_mission_completed",
      meta: { curso_id: cursoId, mission_id: missionId },
    });
  };

  return {
    certificates,
    isLoading,
    refetch,
    getCertificateForCourse,
    issueCertificate,
    setPrivacy,
    trackCertificateViewed,
    trackCertificateShared,
    trackPostCourseMissionStarted,
    trackPostCourseMissionCompleted,
  };
}

// Hook to verify a certificate by code (public)
export function useVerifyCertificate(code: string | undefined) {
  return useQuery({
    queryKey: ["verify_certificate", code],
    queryFn: async () => {
      if (!code) return null;
      
      const { data, error } = await supabase
        .from("formacao_certificates")
        .select(`
          id,
          issued_at,
          certificate_code,
          curso:cursos_formacao (
            id,
            titulo,
            nivel,
            estimativa_min
          )
        `)
        .eq("certificate_code", code)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!code,
  });
}

// Hook for public certificate verification (uses RPC, no auth required)
export function usePublicCertificate(code: string | undefined) {
  return useQuery({
    queryKey: ["public_certificate", code],
    queryFn: async (): Promise<PublicCertificateData> => {
      if (!code) {
        return { ok: false, status: "not_found" };
      }

      const { data, error } = await supabase.rpc("get_certificate_public", {
        _code: code,
      });

      if (error) {
        console.error("Error fetching public certificate:", error);
        return { ok: false, status: "not_found" };
      }

      // Cast through unknown for RPC jsonb return type
      return data as unknown as PublicCertificateData;
    },
    enabled: !!code,
  });
}
