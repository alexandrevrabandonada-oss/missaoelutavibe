import { useState, useEffect } from "react";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageOff } from "lucide-react";

interface SecureImageProps {
  bucket: string;
  pathOrUrl: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  expiresIn?: number;
  onClick?: () => void;
}

/**
 * A secure image component that automatically generates signed URLs
 * for private storage bucket files.
 */
export function SecureImage({
  bucket,
  pathOrUrl,
  alt,
  className = "",
  fallbackClassName = "",
  expiresIn = 3600,
  onClick,
}: SecureImageProps) {
  const { signedUrl, isLoading, error } = useSignedUrl(bucket, pathOrUrl, expiresIn);
  const [imageError, setImageError] = useState(false);

  // Reset image error when URL changes
  useEffect(() => {
    setImageError(false);
  }, [signedUrl]);

  if (!pathOrUrl) {
    return null;
  }

  if (isLoading) {
    return (
      <Skeleton 
        className={`${className} ${fallbackClassName}`} 
      />
    );
  }

  if (error || !signedUrl || imageError) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted ${className} ${fallbackClassName}`}
        title={error?.message || "Failed to load image"}
      >
        <ImageOff className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={() => setImageError(true)}
    />
  );
}

interface SecureImageLinkProps extends SecureImageProps {
  target?: string;
  rel?: string;
}

/**
 * A secure image wrapped in a link that opens in a new tab.
 * Uses signed URLs for both the image and the link.
 */
export function SecureImageLink({
  bucket,
  pathOrUrl,
  alt,
  className = "",
  fallbackClassName = "",
  expiresIn = 3600,
  target = "_blank",
  rel = "noopener noreferrer",
}: SecureImageLinkProps) {
  const { signedUrl, isLoading, error } = useSignedUrl(bucket, pathOrUrl, expiresIn);
  const [imageError, setImageError] = useState(false);

  // Reset image error when URL changes
  useEffect(() => {
    setImageError(false);
  }, [signedUrl]);

  if (!pathOrUrl) {
    return null;
  }

  if (isLoading) {
    return (
      <Skeleton 
        className={`${className} ${fallbackClassName}`} 
      />
    );
  }

  if (error || !signedUrl || imageError) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted ${className} ${fallbackClassName}`}
        title={error?.message || "Failed to load image"}
      >
        <ImageOff className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <a
      href={signedUrl}
      target={target}
      rel={rel}
      className="block"
    >
      <img
        src={signedUrl}
        alt={alt}
        className={className}
        onError={() => setImageError(true)}
      />
    </a>
  );
}
