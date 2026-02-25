import Image from "next/image";

interface OptimizedImageProps {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

/**
 * Wrapper around next/image for consistent image rendering from /media/ paths.
 * Uses fill layout with object-cover by default. Set priority=true for
 * above-the-fold hero images to optimize LCP.
 */
export function OptimizedImage({
  src,
  alt,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 768px",
  className,
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      className={className ?? "object-cover"}
      sizes={sizes}
    />
  );
}
