"use client";

import { useState } from "react";
import { AdminButton } from "@/components/admin/ui";
import { MediaLibraryModal } from "@/components/admin/media-library-modal";

interface ImagePickerProps {
  label: string;
  value: string;
  onChange: (path: string) => void;
  "data-testid"?: string;
}

export function ImagePicker({ label, value, onChange, ...props }: ImagePickerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const testId = props["data-testid"] ?? "image-picker";

  return (
    <div className="space-y-2" data-testid={testId}>
      <label className="block text-sm font-medium text-foreground">{label}</label>

      {value ? (
        <div className="space-y-2">
          <div className="relative inline-block">
            <img
              src={value}
              alt="Selected"
              className="h-24 w-auto rounded border border-border object-contain"
              data-testid={`${testId}-preview`}
            />
          </div>
          <div className="text-xs text-muted-foreground truncate" data-testid={`${testId}-path`}>
            {value}
          </div>
          <div className="flex gap-2">
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={() => setModalOpen(true)}
              data-testid={`${testId}-choose`}
            >
              Change
            </AdminButton>
            <AdminButton
              variant="danger"
              size="sm"
              onClick={() => onChange("")}
              data-testid={`${testId}-remove`}
            >
              Remove
            </AdminButton>
          </div>
        </div>
      ) : (
        <AdminButton
          variant="secondary"
          size="sm"
          onClick={() => setModalOpen(true)}
          data-testid={`${testId}-choose`}
        >
          Choose image
        </AdminButton>
      )}

      <MediaLibraryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={(path) => {
          onChange(path);
          setModalOpen(false);
        }}
      />
    </div>
  );
}
