import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export type MaterialCategoria = 'arte' | 'video' | 'panfleto' | 'logo' | 'texto' | 'outro';
export type MaterialFormato = 'png' | 'jpg' | 'pdf' | 'mp4' | 'link' | 'texto';
export type MaterialStatus = 'rascunho' | 'aprovado' | 'arquivado';

export interface Material {
  id: string;
  categoria: MaterialCategoria;
  titulo: string;
  descricao: string | null;
  tags: string[];
  formato: MaterialFormato;
  arquivo_url: string | null;
  legenda_pronta: string | null;
  status: MaterialStatus;
  criado_por: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMaterialInput {
  categoria: MaterialCategoria;
  titulo: string;
  descricao?: string;
  tags?: string[];
  formato: MaterialFormato;
  arquivo_url?: string;
  legenda_pronta?: string;
  status?: MaterialStatus;
}

export interface UpdateMaterialInput extends Partial<CreateMaterialInput> {
  id: string;
}

export const CATEGORIAS: { value: MaterialCategoria; label: string }[] = [
  { value: 'arte', label: 'Arte' },
  { value: 'video', label: 'Vídeo' },
  { value: 'panfleto', label: 'Panfleto' },
  { value: 'logo', label: 'Logo' },
  { value: 'texto', label: 'Texto' },
  { value: 'outro', label: 'Outro' },
];

export const FORMATOS: { value: MaterialFormato; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPG' },
  { value: 'pdf', label: 'PDF' },
  { value: 'mp4', label: 'MP4' },
  { value: 'link', label: 'Link' },
  { value: 'texto', label: 'Texto' },
];

export function useMateriais(filters?: { categoria?: MaterialCategoria; tag?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch approved materials (for volunteers)
  const materiaisQuery = useQuery({
    queryKey: ["materiais", filters?.categoria, filters?.tag],
    queryFn: async () => {
      let query = supabase
        .from("materiais_base")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.categoria) {
        query = query.eq("categoria", filters.categoria);
      }

      if (filters?.tag) {
        query = query.contains("tags", [filters.tag]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Material[];
    },
    enabled: !!user,
  });

  // Fetch all materials (for admin)
  const allMateriaisQuery = useQuery({
    queryKey: ["materiais-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materiais_base")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Material[];
    },
    enabled: !!user,
  });

  // Fetch single material
  const useMaterialById = (id: string) => {
    return useQuery({
      queryKey: ["material", id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("materiais_base")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        return data as Material;
      },
      enabled: !!id && !!user,
    });
  };

  // Create material
  const createMutation = useMutation({
    mutationFn: async (input: CreateMaterialInput) => {
      const { data, error } = await supabase
        .from("materiais_base")
        .insert({
          ...input,
          criado_por: user!.id,
          tags: input.tags || [],
          status: input.status || "rascunho",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materiais"] });
      queryClient.invalidateQueries({ queryKey: ["materiais-admin"] });
      toast({ title: "Material criado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar material", description: error.message, variant: "destructive" });
    },
  });

  // Update material
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: UpdateMaterialInput) => {
      const { data, error } = await supabase
        .from("materiais_base")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materiais"] });
      queryClient.invalidateQueries({ queryKey: ["materiais-admin"] });
      toast({ title: "Material atualizado!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar material", description: error.message, variant: "destructive" });
    },
  });

  // Delete material
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("materiais_base")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materiais"] });
      queryClient.invalidateQueries({ queryKey: ["materiais-admin"] });
      toast({ title: "Material removido!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover material", description: error.message, variant: "destructive" });
    },
  });

  // Upload file
  const uploadFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${user!.id}/${fileName}`;

    const { error } = await supabase.storage
      .from("materiais")
      .upload(filePath, file);

    if (error) {
      toast({ title: "Erro ao fazer upload", description: error.message, variant: "destructive" });
      return null;
    }

    const { data } = supabase.storage.from("materiais").getPublicUrl(filePath);
    return data.publicUrl;
  };

  return {
    materiais: materiaisQuery.data || [],
    isLoading: materiaisQuery.isLoading,
    allMateriais: allMateriaisQuery.data || [],
    isLoadingAll: allMateriaisQuery.isLoading,
    useMaterialById,
    createMaterial: createMutation.mutate,
    updateMaterial: updateMutation.mutate,
    deleteMaterial: deleteMutation.mutate,
    uploadFile,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
