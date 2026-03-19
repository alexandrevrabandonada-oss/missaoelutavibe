import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type ContentType = 'MATERIAL' | 'SHAREPACK' | 'TEMPLATE';
export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ContentAssetRole = 'PRIMARY' | 'THUMBNAIL' | 'CARD_1x1' | 'CARD_4x5' | 'STORY_9x16' | 'THUMB_16x9' | 'ATTACHMENT';

export interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  description: string | null;
  status: ContentStatus;
  tags: string[];
  scope_tipo: string;
  scope_id: string | null;
  legenda_whatsapp: string | null;
  legenda_instagram: string | null;
  legenda_tiktok: string | null;
  hashtags: string[];
  hook: string | null;
  cta: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  published_by: string | null;
  parent_content_id: string | null;
}

export interface ContentAsset {
  id: string;
  content_id?: string;
  asset_id: string;
  role: ContentAssetRole;
  ordem: number;
  created_at?: string;
  asset?: {
    id: string;
    title: string;
    kind: string;
    bucket: string;
    path: string;
    mime_type: string | null;
  };
}

export interface ContentWithAssets extends ContentItem {
  content_assets: ContentAsset[];
}

export interface CreateContentInput {
  type: ContentType;
  title: string;
  description?: string;
  tags?: string[];
  scope_tipo?: string;
  scope_id?: string;
  legenda_whatsapp?: string;
  legenda_instagram?: string;
  legenda_tiktok?: string;
  hashtags?: string[];
  hook?: string;
  cta?: string;
}

export interface ContentFilters {
  type?: ContentType;
  status?: ContentStatus;
  search?: string;
  tag?: string;
}

// Query content items with filters
export function useContentItems(filters?: ContentFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["content-items", filters],
    queryFn: async () => {
      let query = supabase
        .from("content_items")
        .select(`
          *,
          content_assets (
            id,
            content_id,
            asset_id,
            role,
            ordem,
            created_at,
            asset:assets (
              id,
              title,
              kind,
              bucket,
              path,
              mime_type
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (filters?.type) {
        query = query.eq("type", filters.type);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.tag) {
        query = query.contains("tags", [filters.tag]);
      }

      if (filters?.search) {
        const escaped = filters.search.replace(/[%_\\]/g, '\\$&');
        query = query.ilike("title", `%${escaped}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ContentWithAssets[];
    },
    enabled: !!user,
  });
}

// Get single content item with assets
export function useContentItem(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["content-item", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("content_items")
        .select(`
          *,
          content_assets (
            id,
            content_id,
            asset_id,
            role,
            ordem,
            created_at,
            asset:assets (
              id,
              title,
              kind,
              bucket,
              path,
              mime_type
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as ContentWithAssets;
    },
    enabled: !!user && !!id,
  });
}

// Create content item
export function useCreateContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateContentInput) => {
      const { data, error } = await supabase
        .from("content_items")
        .insert({
          ...input,
          created_by: user!.id,
          tags: input.tags || [],
          hashtags: input.hashtags || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data as ContentItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-items"] });
      toast.success("Conteúdo criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar conteúdo", { description: error.message });
    },
  });
}

// Update content item
export function useUpdateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateContentInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("content_items")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as ContentItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["content-items"] });
      queryClient.invalidateQueries({ queryKey: ["content-item", data.id] });
      toast.success("Conteúdo atualizado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar", { description: error.message });
    },
  });
}

// Publish content
export function usePublishContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("content_items")
        .update({
          status: "PUBLISHED" as ContentStatus,
          published_at: new Date().toISOString(),
          published_by: user!.id,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["content-items"] });
      queryClient.invalidateQueries({ queryKey: ["content-item", data.id] });
      toast.success("Conteúdo publicado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao publicar", { description: error.message });
    },
  });
}

// Archive content
export function useArchiveContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("content_items")
        .update({ status: "ARCHIVED" as ContentStatus })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["content-items"] });
      queryClient.invalidateQueries({ queryKey: ["content-item", data.id] });
      toast.success("Conteúdo arquivado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao arquivar", { description: error.message });
    },
  });
}

// Link asset to content
export function useLinkAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contentId,
      assetId,
      role,
      ordem = 0,
    }: {
      contentId: string;
      assetId: string;
      role: ContentAssetRole;
      ordem?: number;
    }) => {
      const { data, error } = await supabase
        .from("content_assets")
        .insert({
          content_id: contentId,
          asset_id: assetId,
          role,
          ordem,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["content-item", variables.contentId] });
      queryClient.invalidateQueries({ queryKey: ["content-items"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao vincular asset", { description: error.message });
    },
  });
}

// Unlink asset from content
export function useUnlinkAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contentId, assetId }: { contentId: string; assetId: string }) => {
      const { error } = await supabase
        .from("content_assets")
        .delete()
        .eq("content_id", contentId)
        .eq("asset_id", assetId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["content-item", variables.contentId] });
      queryClient.invalidateQueries({ queryKey: ["content-items"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao desvincular asset", { description: error.message });
    },
  });
}

// Get public URL for an asset
export function getAssetUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Get primary asset URL for a content item
export function getPrimaryAssetUrl(content: ContentWithAssets): string | null {
  const primaryAsset = content.content_assets?.find(
    (ca) => ca.role === "PRIMARY" && ca.asset
  );
  if (!primaryAsset?.asset) return null;
  return getAssetUrl(primaryAsset.asset.bucket, primaryAsset.asset.path);
}

// Get asset by role
export function getAssetByRole(
  content: ContentWithAssets,
  role: ContentAssetRole
): ContentAsset["asset"] | null {
  const found = content.content_assets?.find((ca) => ca.role === role);
  return found?.asset || null;
}
