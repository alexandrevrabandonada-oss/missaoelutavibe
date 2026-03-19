import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useStorage() {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadEvidenceImage = async (file: File): Promise<string | null> => {
    if (!user?.id) {
      throw new Error("Usuário não autenticado");
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create unique file path: userId/timestamp-filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from("evidences")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(100);

      // Return file path instead of public URL for private bucket
      // Signed URLs will be generated on-the-fly when displaying
      return filePath;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteEvidenceImage = async (url: string): Promise<void> => {
    if (!user?.id) {
      throw new Error("Usuário não autenticado");
    }

    try {
      // Extract file path from URL
      const urlParts = url.split("/evidences/");
      if (urlParts.length < 2) return;
      
      const filePath = urlParts[1];

      const { error } = await supabase.storage
        .from("evidences")
        .remove([filePath]);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting image:", error);
      throw error;
    }
  };

  return {
    uploadEvidenceImage,
    deleteEvidenceImage,
    isUploading,
    uploadProgress,
  };
}
