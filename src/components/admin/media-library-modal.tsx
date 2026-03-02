"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { listFiles, uploadImage } from "@/lib/admin/github";
import type { GitHubFileEntry } from "@/lib/admin/github";
import { AdminButton } from "@/components/admin/ui";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"]);

function isImageFile(name: string): boolean {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

interface MediaLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
}

type UploadState = "idle" | "previewing" | "uploading" | "done" | "error";

export function MediaLibraryModal({ open, onClose, onSelect }: MediaLibraryModalProps) {
  const { token } = useAdminAuth();
  const [images, setImages] = useState<GitHubFileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Load images from GitHub
  const loadImages = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const entries = await listFiles(token, "public/media");
      const imageEntries = entries.filter((e) => e.type === "file" && isImageFile(e.name));
      setImages(imageEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load images");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (open && token) {
      loadImages();
    }
  }, [open, token, loadImages]);

  // Reset upload state on close
  useEffect(() => {
    if (!open) {
      setUploadState("idle");
      setUploadFile(null);
      setUploadPreview(null);
      setUploadError(null);
      setUploadNotice(null);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  // Handle file select
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setUploadError(null);
    setUploadNotice(null);

    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(reader.result as string);
      setUploadState("previewing");
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Upload the file
  const handleUpload = useCallback(async () => {
    if (!token || !uploadFile || !uploadPreview) return;

    setUploadState("uploading");
    setUploadError(null);

    try {
      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64 = uploadPreview.split(",")[1];
      const filePath = `public/media/${uploadFile.name}`;
      const message = `media: upload ${uploadFile.name}`;

      await uploadImage(token, filePath, base64, message);

      setUploadState("done");
      setUploadNotice("Image uploaded. Deploy triggered.");
      setUploadFile(null);
      setUploadPreview(null);

      // Refresh the image list
      await loadImages();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setUploadState("error");
    }
  }, [token, uploadFile, uploadPreview, loadImages]);

  const cancelUpload = useCallback(() => {
    setUploadState("idle");
    setUploadFile(null);
    setUploadPreview(null);
    setUploadError(null);
  }, []);

  const handleSelect = useCallback(
    (entry: GitHubFileEntry) => {
      // Convert "public/media/file.jpg" to "/media/file.jpg"
      const path = `/${entry.path.replace(/^public\//, "")}`;
      onSelect(path);
      onClose();
    },
    [onSelect, onClose],
  );

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      data-testid="media-library-backdrop"
    >
      <div
        className="relative mx-4 max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-background shadow-lg flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Media Library"
        data-testid="media-library-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-foreground">Media Library</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
            aria-label="Close"
            data-testid="media-library-close"
          >
            &times;
          </button>
        </div>

        {/* Upload section */}
        <div className="border-b border-border px-4 py-3 space-y-3">
          {uploadState === "idle" && (
            <div className="flex items-center gap-2">
              <AdminButton
                variant="primary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                data-testid="media-upload-button"
              >
                Upload image
              </AdminButton>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                data-testid="media-upload-input"
              />
            </div>
          )}

          {uploadState === "previewing" && uploadPreview && (
            <div className="space-y-2" data-testid="media-upload-preview">
              <p className="text-sm text-muted-foreground">
                Preview: <strong>{uploadFile?.name}</strong>
              </p>
              <img
                src={uploadPreview}
                alt="Upload preview"
                className="h-24 w-auto rounded border border-border object-contain"
              />
              <div className="flex gap-2">
                <AdminButton variant="primary" size="sm" onClick={handleUpload} data-testid="media-upload-confirm">
                  Confirm upload
                </AdminButton>
                <AdminButton variant="secondary" size="sm" onClick={cancelUpload} data-testid="media-upload-cancel">
                  Cancel
                </AdminButton>
              </div>
            </div>
          )}

          {uploadState === "uploading" && (
            <div className="flex items-center gap-2" data-testid="media-upload-progress">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="text-sm text-muted-foreground">Uploading {uploadFile?.name}...</p>
            </div>
          )}

          {uploadState === "error" && (
            <div className="space-y-2">
              <p className="text-sm text-red-600 dark:text-red-400" data-testid="media-upload-error">{uploadError}</p>
              <AdminButton variant="secondary" size="sm" onClick={cancelUpload}>
                Try again
              </AdminButton>
            </div>
          )}

          {uploadState === "done" && uploadNotice && (
            <div className="flex items-center gap-2">
              <p className="text-sm text-green-600 dark:text-green-400" data-testid="media-upload-notice">{uploadNotice}</p>
              <AdminButton
                variant="secondary"
                size="sm"
                onClick={() => { setUploadState("idle"); setUploadNotice(null); }}
              >
                Upload another
              </AdminButton>
            </div>
          )}
        </div>

        {/* Image grid */}
        <div className="flex-1 overflow-y-auto p-4" data-testid="media-library-grid">
          {loading && (
            <p className="text-sm text-muted-foreground" data-testid="media-library-loading">Loading images...</p>
          )}

          {error && (
            <div className="space-y-2">
              <p className="text-sm text-red-600 dark:text-red-400" data-testid="media-library-error">{error}</p>
              <AdminButton variant="secondary" size="sm" onClick={loadImages}>Retry</AdminButton>
            </div>
          )}

          {!loading && !error && images.length === 0 && (
            <p className="text-sm text-muted-foreground" data-testid="media-library-empty">No images found. Upload one above.</p>
          )}

          {!loading && !error && images.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((entry) => (
                <button
                  key={entry.sha}
                  onClick={() => handleSelect(entry)}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-border hover:border-accent transition-colors"
                  data-testid={`media-item-${entry.name}`}
                  title={entry.name}
                >
                  <img
                    src={`/${entry.path.replace(/^public\//, "")}`}
                    alt={entry.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-xs text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {entry.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
