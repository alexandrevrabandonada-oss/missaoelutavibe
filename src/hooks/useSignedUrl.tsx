import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to generate signed URLs for private storage bucket files.
 * Signed URLs expire after the specified duration (default 1 hour).
 */
export function useSignedUrl(
  bucket: string,
  pathOrUrl: string | null,
  expiresIn: number = 3600 // 1 hour default
) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!pathOrUrl) {
      setSignedUrl(null);
      return;
    }

    const generateSignedUrl = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Extract file path from full URL if needed
        const filePath = extractFilePath(bucket, pathOrUrl);
        
        if (!filePath) {
          setSignedUrl(null);
          return;
        }

        const { data, error: signedUrlError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, expiresIn);

        if (signedUrlError) {
          throw signedUrlError;
        }

        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error("Error generating signed URL:", err);
        setError(err instanceof Error ? err : new Error("Failed to generate signed URL"));
        setSignedUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    generateSignedUrl();
  }, [bucket, pathOrUrl, expiresIn]);

  return { signedUrl, isLoading, error };
}

/**
 * Hook to generate signed URLs for multiple files at once.
 */
export function useSignedUrls(
  bucket: string,
  pathsOrUrls: string[],
  expiresIn: number = 3600
) {
  const [signedUrls, setSignedUrls] = useState<(string | null)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!pathsOrUrls.length) {
      setSignedUrls([]);
      return;
    }

    const generateSignedUrls = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const urls = await Promise.all(
          pathsOrUrls.map(async (pathOrUrl) => {
            const filePath = extractFilePath(bucket, pathOrUrl);
            
            if (!filePath) {
              return null;
            }

            const { data, error: signedUrlError } = await supabase.storage
              .from(bucket)
              .createSignedUrl(filePath, expiresIn);

            if (signedUrlError) {
              console.error("Error generating signed URL:", signedUrlError);
              return null;
            }

            return data.signedUrl;
          })
        );

        setSignedUrls(urls);
      } catch (err) {
        console.error("Error generating signed URLs:", err);
        setError(err instanceof Error ? err : new Error("Failed to generate signed URLs"));
        setSignedUrls([]);
      } finally {
        setIsLoading(false);
      }
    };

    generateSignedUrls();
  }, [bucket, JSON.stringify(pathsOrUrls), expiresIn]);

  return { signedUrls, isLoading, error };
}

/**
 * Extract file path from a storage URL or return the path as-is.
 * Handles both full URLs and relative paths.
 */
function extractFilePath(bucket: string, pathOrUrl: string): string | null {
  if (!pathOrUrl || !pathOrUrl.trim()) {
    return null;
  }

  const trimmed = pathOrUrl.trim();

  // If it's already a relative path (doesn't start with http), return as-is
  if (!trimmed.startsWith("http")) {
    return trimmed;
  }

  // Extract path from full Supabase storage URL
  // URLs look like: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
  // or: https://{project}.supabase.co/storage/v1/object/sign/{bucket}/{path}?token=...
  const bucketPattern = new RegExp(`/${bucket}/(.+?)(?:\\?|$)`);
  const match = trimmed.match(bucketPattern);
  
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }

  // Fallback: try splitting by bucket name
  const parts = trimmed.split(`/${bucket}/`);
  if (parts.length >= 2) {
    // Remove query params if any
    return parts[1].split("?")[0];
  }

  return null;
}

/**
 * Utility function to generate a signed URL synchronously (returns a promise).
 * Useful for one-off URL generation outside of React hooks.
 */
export async function getSignedUrl(
  bucket: string,
  pathOrUrl: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const filePath = extractFilePath(bucket, pathOrUrl);
  
  if (!filePath) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error("Error generating signed URL:", error);
    return null;
  }

  return data.signedUrl;
}
