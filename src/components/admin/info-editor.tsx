"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { createContentManager } from "@/lib/admin/content-manager";
import {
  saveDraft,
  loadDraft,
  hasDraft,
  setOriginal,
  getDirtyKeys,
} from "@/lib/admin/draft-manager";
import { InfoSchema } from "@/schemas";
import type { Info, InfoSection } from "@/schemas";
import type { Language } from "@/schemas/languages";
import { LANGUAGES } from "@/schemas/languages";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminTextarea,
} from "@/components/admin/ui";
import { LanguageTabs } from "@/components/admin/language-tabs";
import { DraftRecoveryDialog } from "@/components/admin/draft-recovery-dialog";
import { DraftIndicator } from "@/components/admin/draft-indicator";

const DRAFT_KEYS: Record<Language, string> = {
  en: "content/info.en.json",
  lv: "content/info.lv.json",
  ru: "content/info.ru.json",
};

type LoadingState = "idle" | "loading" | "loaded" | "error";

interface InfoData {
  en: Info;
  lv: Info;
  ru: Info;
}

const SECTION_TYPES: { value: InfoSection["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "bullets", label: "Bullet List" },
  { value: "image", label: "Image" },
];

function createEmptySection(type: InfoSection["type"]): InfoSection {
  switch (type) {
    case "text":
      return { type: "text", title: "", content: "" };
    case "bullets":
      return { type: "bullets", title: "", items: [""] };
    case "image":
      return { type: "image", imagePath: "", caption: "" };
  }
}

function getDefaultInfo(): Info {
  return {
    id: "info",
    updatedAt: new Date().toISOString(),
    seo: { title: "", description: "" },
    title: "",
    sections: [{ type: "text", title: "", content: "" }],
  };
}

export function InfoEditor() {
  const { token } = useAdminAuth();
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InfoData | null>(null);
  const [activeLang, setActiveLang] = useState<Language>("en");
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [pendingServerData, setPendingServerData] = useState<InfoData | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const isDirty = useMemo(() => {
    const dirty = getDirtyKeys();
    return LANGUAGES.some((lang) => dirty.includes(DRAFT_KEYS[lang]));
  }, [data]);

  const cm = useMemo(() => {
    if (!token) return null;
    return createContentManager(token);
  }, [token]);

  // Autosave
  useEffect(() => {
    if (!data) return;
    for (const lang of LANGUAGES) {
      saveDraft(DRAFT_KEYS[lang], data[lang]);
    }
  }, [data]);

  const validateData = useCallback((d: InfoData): boolean => {
    const errors: Record<string, string> = {};
    let valid = true;
    for (const lang of LANGUAGES) {
      const result = InfoSchema.safeParse(d[lang]);
      if (!result.success) {
        valid = false;
        for (const issue of result.error.issues) {
          errors[`${lang}.${issue.path.join(".")}`] = issue.message;
        }
      }
    }
    setValidationErrors(errors);
    return valid;
  }, []);

  const loadFromGitHub = useCallback(async () => {
    if (!cm) return;
    setLoadingState("loading");
    setError(null);
    try {
      const [en, lv, ru] = await Promise.all([
        cm.loadInfo("en"),
        cm.loadInfo("lv"),
        cm.loadInfo("ru"),
      ]);
      const serverData: InfoData = { en, lv, ru };
      for (const lang of LANGUAGES) {
        setOriginal(DRAFT_KEYS[lang], serverData[lang]);
      }
      const hasDrafts = LANGUAGES.some((lang) => hasDraft(DRAFT_KEYS[lang]));
      if (hasDrafts) {
        setPendingServerData(serverData);
        setShowDraftRecovery(true);
        setLoadingState("loaded");
      } else {
        setData(serverData);
        setLoadingState("loaded");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load info");
      setLoadingState("error");
    }
  }, [cm]);

  useEffect(() => {
    if (loadingState === "idle" && cm) {
      loadFromGitHub();
    }
  }, [loadFromGitHub, loadingState, cm]);

  const handleRestoreDraft = useCallback(() => {
    const restored: InfoData = {
      en: loadDraft<Info>(DRAFT_KEYS.en) ?? pendingServerData?.en ?? getDefaultInfo(),
      lv: loadDraft<Info>(DRAFT_KEYS.lv) ?? pendingServerData?.lv ?? getDefaultInfo(),
      ru: loadDraft<Info>(DRAFT_KEYS.ru) ?? pendingServerData?.ru ?? getDefaultInfo(),
    };
    setData(restored);
    setShowDraftRecovery(false);
    setPendingServerData(null);
    validateData(restored);
  }, [pendingServerData, validateData]);

  const handleDiscardDraft = useCallback(() => {
    if (pendingServerData) {
      setData(pendingServerData);
      validateData(pendingServerData);
    }
    setShowDraftRecovery(false);
    setPendingServerData(null);
  }, [pendingServerData, validateData]);

  // Update title (per-language)
  const updateTitle = useCallback(
    (lang: Language, value: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const updated: InfoData = {
          ...prev,
          [lang]: { ...prev[lang], updatedAt: new Date().toISOString(), title: value },
        };
        validateData(updated);
        return updated;
      });
    },
    [validateData],
  );

  // Update SEO field (per-language)
  const updateSeoField = useCallback(
    (lang: Language, field: string, value: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const updated: InfoData = {
          ...prev,
          [lang]: {
            ...prev[lang],
            updatedAt: new Date().toISOString(),
            seo: { ...prev[lang].seo, [field]: value },
          },
        };
        validateData(updated);
        return updated;
      });
    },
    [validateData],
  );

  // Add section (synced across all languages)
  const addSection = useCallback(
    (type: InfoSection["type"]) => {
      setData((prev) => {
        if (!prev) return prev;
        const now = new Date().toISOString();
        const updated = { ...prev };
        for (const lang of LANGUAGES) {
          updated[lang] = {
            ...prev[lang],
            updatedAt: now,
            sections: [...prev[lang].sections, createEmptySection(type)],
          };
        }
        validateData(updated);
        return updated;
      });
    },
    [validateData],
  );

  // Delete section (synced across all languages)
  const deleteSection = useCallback(
    (index: number) => {
      setData((prev) => {
        if (!prev) return prev;
        const now = new Date().toISOString();
        const updated = { ...prev };
        for (const lang of LANGUAGES) {
          updated[lang] = {
            ...prev[lang],
            updatedAt: now,
            sections: prev[lang].sections.filter((_, i) => i !== index),
          };
        }
        validateData(updated);
        return updated;
      });
    },
    [validateData],
  );

  // Move section up/down (synced across all languages)
  const moveSection = useCallback(
    (index: number, direction: "up" | "down") => {
      setData((prev) => {
        if (!prev) return prev;
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= prev.en.sections.length) return prev;

        const now = new Date().toISOString();
        const updated = { ...prev };
        for (const lang of LANGUAGES) {
          const sections = [...prev[lang].sections];
          [sections[index], sections[target]] = [sections[target], sections[index]];
          updated[lang] = { ...prev[lang], updatedAt: now, sections };
        }
        validateData(updated);
        return updated;
      });
    },
    [validateData],
  );

  // Update section field (per-language)
  const updateSectionField = useCallback(
    (lang: Language, index: number, field: string, value: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const sections = [...prev[lang].sections];
        sections[index] = { ...sections[index], [field]: value } as InfoSection;
        const updated: InfoData = {
          ...prev,
          [lang]: { ...prev[lang], updatedAt: new Date().toISOString(), sections },
        };
        validateData(updated);
        return updated;
      });
    },
    [validateData],
  );

  // Update bullet item
  const updateBulletItem = useCallback(
    (lang: Language, sectionIndex: number, itemIndex: number, value: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const sections = [...prev[lang].sections];
        const section = sections[sectionIndex];
        if (section.type !== "bullets") return prev;
        const items = [...section.items];
        items[itemIndex] = value;
        sections[sectionIndex] = { ...section, items };
        const updated: InfoData = {
          ...prev,
          [lang]: { ...prev[lang], updatedAt: new Date().toISOString(), sections },
        };
        validateData(updated);
        return updated;
      });
    },
    [validateData],
  );

  // Add bullet item (synced across all languages)
  const addBulletItem = useCallback(
    (sectionIndex: number) => {
      setData((prev) => {
        if (!prev) return prev;
        const now = new Date().toISOString();
        const updated = { ...prev };
        for (const lang of LANGUAGES) {
          const sections = [...prev[lang].sections];
          const section = sections[sectionIndex];
          if (section.type !== "bullets") continue;
          sections[sectionIndex] = { ...section, items: [...section.items, ""] };
          updated[lang] = { ...prev[lang], updatedAt: now, sections };
        }
        validateData(updated);
        return updated;
      });
    },
    [validateData],
  );

  // Delete bullet item (synced across all languages)
  const deleteBulletItem = useCallback(
    (sectionIndex: number, itemIndex: number) => {
      setData((prev) => {
        if (!prev) return prev;
        const now = new Date().toISOString();
        const updated = { ...prev };
        for (const lang of LANGUAGES) {
          const sections = [...prev[lang].sections];
          const section = sections[sectionIndex];
          if (section.type !== "bullets") continue;
          const items = section.items.filter((_, i) => i !== itemIndex);
          sections[sectionIndex] = { ...section, items };
          updated[lang] = { ...prev[lang], updatedAt: now, sections };
        }
        validateData(updated);
        return updated;
      });
    },
    [validateData],
  );

  // --- Render ---

  if (loadingState === "loading") {
    return (
      <AdminCard title="Info">
        <p className="text-muted-foreground" data-testid="info-loading">Loading info...</p>
      </AdminCard>
    );
  }

  if (loadingState === "error") {
    return (
      <AdminCard title="Info">
        <p className="text-red-600 dark:text-red-400" data-testid="info-error">{error}</p>
        <AdminButton variant="secondary" size="sm" onClick={loadFromGitHub} className="mt-2">
          Retry
        </AdminButton>
      </AdminCard>
    );
  }

  if (showDraftRecovery) {
    return (
      <AdminCard title="Info">
        <DraftRecoveryDialog onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />
      </AdminCard>
    );
  }

  if (!data) return null;

  const langData = data[activeLang];

  return (
    <div className="space-y-6" data-testid="info-editor">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">Info</h2>
        <DraftIndicator visible={isDirty} />
      </div>

      <LanguageTabs activeLang={activeLang} onLangChange={setActiveLang} />

      {/* Title */}
      <AdminInput
        label="Page Title"
        id={`info-title-${activeLang}`}
        value={langData.title}
        onChange={(e) => updateTitle(activeLang, e.target.value)}
        error={validationErrors[`${activeLang}.title`]}
        data-testid={`info-title-${activeLang}`}
      />

      {/* SEO */}
      <div className="space-y-3 rounded-lg border border-border p-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">SEO</h3>
        <AdminInput
          label="SEO Title"
          id={`info-seo-title-${activeLang}`}
          value={langData.seo.title}
          onChange={(e) => updateSeoField(activeLang, "title", e.target.value)}
          error={validationErrors[`${activeLang}.seo.title`]}
          data-testid={`info-seo-title-${activeLang}`}
        />
        <AdminInput
          label="SEO Description"
          id={`info-seo-description-${activeLang}`}
          value={langData.seo.description}
          onChange={(e) => updateSeoField(activeLang, "description", e.target.value)}
          error={validationErrors[`${activeLang}.seo.description`]}
          data-testid={`info-seo-description-${activeLang}`}
        />
        <AdminInput
          label="OG Image Path (optional)"
          id={`info-seo-ogImagePath-${activeLang}`}
          value={langData.seo.ogImagePath ?? ""}
          onChange={(e) => updateSeoField(activeLang, "ogImagePath", e.target.value)}
          placeholder="/media/og-image.jpg"
          data-testid={`info-seo-ogImagePath-${activeLang}`}
        />
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Sections ({langData.sections.length})
        </h3>

        {validationErrors[`${activeLang}.sections`] && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {validationErrors[`${activeLang}.sections`]}
          </p>
        )}

        {langData.sections.map((section, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-border p-3 space-y-3"
            data-testid={`section-${idx}`}
          >
            {/* Section header */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                {section.type} section #{idx + 1}
              </span>
              <div className="flex gap-1">
                <AdminButton
                  variant="secondary"
                  size="sm"
                  onClick={() => moveSection(idx, "up")}
                  disabled={idx === 0}
                  data-testid={`section-${idx}-up`}
                  aria-label={`Move section ${idx + 1} up`}
                >
                  &uarr;
                </AdminButton>
                <AdminButton
                  variant="secondary"
                  size="sm"
                  onClick={() => moveSection(idx, "down")}
                  disabled={idx === langData.sections.length - 1}
                  data-testid={`section-${idx}-down`}
                  aria-label={`Move section ${idx + 1} down`}
                >
                  &darr;
                </AdminButton>
                <AdminButton
                  variant="danger"
                  size="sm"
                  onClick={() => deleteSection(idx)}
                  data-testid={`section-${idx}-delete`}
                >
                  Delete
                </AdminButton>
              </div>
            </div>

            {/* Section content by type */}
            {section.type === "text" && (
              <div className="space-y-2">
                <AdminInput
                  label="Title (optional)"
                  id={`section-${idx}-title-${activeLang}`}
                  value={section.title ?? ""}
                  onChange={(e) => updateSectionField(activeLang, idx, "title", e.target.value)}
                  data-testid={`section-${idx}-title-${activeLang}`}
                />
                <AdminTextarea
                  label="Content"
                  id={`section-${idx}-content-${activeLang}`}
                  value={section.content}
                  onChange={(e) => updateSectionField(activeLang, idx, "content", e.target.value)}
                  rows={4}
                  error={validationErrors[`${activeLang}.sections.${idx}.content`]}
                  data-testid={`section-${idx}-content-${activeLang}`}
                />
              </div>
            )}

            {section.type === "bullets" && (
              <div className="space-y-2">
                <AdminInput
                  label="Title (optional)"
                  id={`section-${idx}-title-${activeLang}`}
                  value={section.title ?? ""}
                  onChange={(e) => updateSectionField(activeLang, idx, "title", e.target.value)}
                  data-testid={`section-${idx}-title-${activeLang}`}
                />
                <div className="space-y-2">
                  {section.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex gap-2">
                      <div className="flex-1">
                        <AdminInput
                          label={`Item ${itemIdx + 1}`}
                          id={`section-${idx}-item-${itemIdx}-${activeLang}`}
                          value={item}
                          onChange={(e) =>
                            updateBulletItem(activeLang, idx, itemIdx, e.target.value)
                          }
                          error={
                            validationErrors[
                              `${activeLang}.sections.${idx}.items.${itemIdx}`
                            ]
                          }
                          data-testid={`section-${idx}-item-${itemIdx}-${activeLang}`}
                        />
                      </div>
                      <div className="pt-6">
                        <AdminButton
                          variant="danger"
                          size="sm"
                          onClick={() => deleteBulletItem(idx, itemIdx)}
                          disabled={section.items.length <= 1}
                          data-testid={`section-${idx}-item-${itemIdx}-delete`}
                        >
                          &times;
                        </AdminButton>
                      </div>
                    </div>
                  ))}
                  <AdminButton
                    variant="secondary"
                    size="sm"
                    onClick={() => addBulletItem(idx)}
                    data-testid={`section-${idx}-add-item`}
                  >
                    + Add item
                  </AdminButton>
                </div>
              </div>
            )}

            {section.type === "image" && (
              <div className="space-y-2">
                <AdminInput
                  label="Image Path"
                  id={`section-${idx}-imagePath-${activeLang}`}
                  value={section.imagePath}
                  onChange={(e) =>
                    updateSectionField(activeLang, idx, "imagePath", e.target.value)
                  }
                  placeholder="/media/image.jpg"
                  error={validationErrors[`${activeLang}.sections.${idx}.imagePath`]}
                  data-testid={`section-${idx}-imagePath-${activeLang}`}
                />
                <AdminInput
                  label="Caption (optional)"
                  id={`section-${idx}-caption-${activeLang}`}
                  value={section.caption ?? ""}
                  onChange={(e) =>
                    updateSectionField(activeLang, idx, "caption", e.target.value)
                  }
                  data-testid={`section-${idx}-caption-${activeLang}`}
                />
              </div>
            )}
          </div>
        ))}

        {/* Add section */}
        <div
          className="flex flex-wrap gap-2 rounded-lg border border-dashed border-border p-3"
          data-testid="add-section-bar"
        >
          <span className="text-sm text-muted-foreground self-center mr-2">Add section:</span>
          {SECTION_TYPES.map(({ value, label }) => (
            <AdminButton
              key={value}
              variant="secondary"
              size="sm"
              onClick={() => addSection(value)}
              data-testid={`add-section-${value}`}
            >
              + {label}
            </AdminButton>
          ))}
        </div>
      </div>
    </div>
  );
}
