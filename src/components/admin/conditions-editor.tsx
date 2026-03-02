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
import { ConditionSchema, ConditionsIndexSchema } from "@/schemas";
import type { Condition, ConditionsIndex } from "@/schemas";
import type { InfoSection } from "@/schemas";
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
import { ImagePicker } from "@/components/admin/image-picker";

const INDEX_DRAFT_KEY = "content/conditions/index.json";

function conditionDraftKey(slug: string, lang: Language): string {
  return `content/conditions/${slug}/condition.${lang}.json`;
}

type LoadingState = "idle" | "loading" | "loaded" | "error";
type View = "list" | "edit";

interface ConditionData {
  en: Condition;
  lv: Condition;
  ru: Condition;
}

function createEmptyCondition(id: string, slug: string): Condition {
  return {
    id,
    slug,
    updatedAt: new Date().toISOString(),
    seo: { title: "", description: "" },
    title: "",
    intro: "",
    sections: [{ type: "text", title: "", content: "" }],
    contraindications: [],
    faq: [],
  };
}

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

const SECTION_TYPES: { value: InfoSection["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "bullets", label: "Bullet List" },
  { value: "image", label: "Image" },
];

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function ConditionsEditor() {
  const { token } = useAdminAuth();
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState<ConditionsIndex | null>(null);
  const [view, setView] = useState<View>("list");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [conditionData, setConditionData] = useState<ConditionData | null>(null);
  const [activeLang, setActiveLang] = useState<Language>("en");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [pendingServerCondition, setPendingServerCondition] = useState<ConditionData | null>(null);

  // Create form
  const [newSlug, setNewSlug] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState<string | null>(null);

  const isDirty = useMemo(() => {
    const dirty = getDirtyKeys();
    if (dirty.includes(INDEX_DRAFT_KEY)) return true;
    if (editingSlug) {
      return LANGUAGES.some((lang) =>
        dirty.includes(conditionDraftKey(editingSlug, lang)),
      );
    }
    return false;
  }, [index, conditionData, editingSlug]);

  const cm = useMemo(() => {
    if (!token) return null;
    return createContentManager(token);
  }, [token]);

  // Autosave index
  useEffect(() => {
    if (!index) return;
    saveDraft(INDEX_DRAFT_KEY, index);
  }, [index]);

  // Autosave condition
  useEffect(() => {
    if (!conditionData || !editingSlug) return;
    for (const lang of LANGUAGES) {
      saveDraft(conditionDraftKey(editingSlug, lang), conditionData[lang]);
    }
  }, [conditionData, editingSlug]);

  const loadIndex = useCallback(async () => {
    if (!cm) return;
    setLoadingState("loading");
    setError(null);
    try {
      const data = await cm.loadConditionsIndex();
      setOriginal(INDEX_DRAFT_KEY, data);
      setIndex(data);
      setLoadingState("loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conditions index");
      setLoadingState("error");
    }
  }, [cm]);

  useEffect(() => {
    if (loadingState === "idle" && cm) {
      loadIndex();
    }
  }, [loadIndex, loadingState, cm]);

  // Load condition for editing
  const loadCondition = useCallback(
    async (slug: string) => {
      if (!cm) return;
      setError(null);
      try {
        const [en, lv, ru] = await Promise.all([
          cm.loadCondition(slug, "en"),
          cm.loadCondition(slug, "lv"),
          cm.loadCondition(slug, "ru"),
        ]);
        const serverData: ConditionData = { en, lv, ru };
        for (const lang of LANGUAGES) {
          setOriginal(conditionDraftKey(slug, lang), serverData[lang]);
        }

        const hasDrafts = LANGUAGES.some((lang) =>
          hasDraft(conditionDraftKey(slug, lang)),
        );
        if (hasDrafts) {
          setPendingServerCondition(serverData);
          setShowDraftRecovery(true);
        } else {
          setConditionData(serverData);
        }
        setEditingSlug(slug);
        setView("edit");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load condition");
      }
    },
    [cm],
  );

  // Draft recovery
  const handleRestoreDraft = useCallback(() => {
    if (!editingSlug) return;
    const restored: ConditionData = {
      en: loadDraft<Condition>(conditionDraftKey(editingSlug, "en")) ?? pendingServerCondition?.en ?? createEmptyCondition("", editingSlug),
      lv: loadDraft<Condition>(conditionDraftKey(editingSlug, "lv")) ?? pendingServerCondition?.lv ?? createEmptyCondition("", editingSlug),
      ru: loadDraft<Condition>(conditionDraftKey(editingSlug, "ru")) ?? pendingServerCondition?.ru ?? createEmptyCondition("", editingSlug),
    };
    setConditionData(restored);
    setShowDraftRecovery(false);
    setPendingServerCondition(null);
  }, [editingSlug, pendingServerCondition]);

  const handleDiscardDraft = useCallback(() => {
    if (pendingServerCondition) {
      setConditionData(pendingServerCondition);
    }
    setShowDraftRecovery(false);
    setPendingServerCondition(null);
  }, [pendingServerCondition]);

  // Validate condition
  const validateCondition = useCallback((d: ConditionData): boolean => {
    const errors: Record<string, string> = {};
    let valid = true;
    for (const lang of LANGUAGES) {
      const result = ConditionSchema.safeParse(d[lang]);
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

  // --- List operations ---

  const createCondition = useCallback(() => {
    const slug = newSlug.trim();
    if (!slug || !index) return;

    if (!SLUG_REGEX.test(slug)) {
      setCreateError("Slug must be lowercase letters, numbers, and hyphens only");
      return;
    }

    if (index.items.some((item) => item.slug === slug)) {
      setCreateError(`Slug "${slug}" already exists`);
      return;
    }

    const id = `condition-${Date.now()}`;
    const now = new Date().toISOString();
    const newIndex: ConditionsIndex = {
      ...index,
      updatedAt: now,
      items: [
        ...index.items,
        { id, slug, published: false, order: index.items.length + 1 },
      ],
    };
    setIndex(newIndex);

    // Create empty condition drafts for all languages
    for (const lang of LANGUAGES) {
      const empty = createEmptyCondition(id, slug);
      saveDraft(conditionDraftKey(slug, lang), empty);
    }

    setNewSlug("");
    setCreateError(null);
  }, [newSlug, index]);

  const deleteCondition = useCallback(
    (slug: string) => {
      if (!index) return;
      const newIndex: ConditionsIndex = {
        ...index,
        updatedAt: new Date().toISOString(),
        items: index.items.filter((item) => item.slug !== slug),
      };
      setIndex(newIndex);
      setDeleteConfirmSlug(null);
    },
    [index],
  );

  const togglePublished = useCallback(
    (slug: string) => {
      if (!index) return;
      const newIndex: ConditionsIndex = {
        ...index,
        updatedAt: new Date().toISOString(),
        items: index.items.map((item) =>
          item.slug === slug ? { ...item, published: !item.published } : item,
        ),
      };
      setIndex(newIndex);
    },
    [index],
  );

  const moveCondition = useCallback(
    (idx: number, direction: "up" | "down") => {
      if (!index) return;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= index.items.length) return;
      const items = [...index.items];
      [items[idx], items[target]] = [items[target], items[idx]];
      const reordered = items.map((item, i) => ({ ...item, order: i + 1 }));
      setIndex({ ...index, updatedAt: new Date().toISOString(), items: reordered });
    },
    [index],
  );

  // --- Condition edit operations ---

  const updateField = useCallback(
    (lang: Language, field: string, value: string) => {
      setConditionData((prev) => {
        if (!prev) return prev;
        const updated: ConditionData = {
          ...prev,
          [lang]: { ...prev[lang], updatedAt: new Date().toISOString(), [field]: value },
        };
        validateCondition(updated);
        return updated;
      });
    },
    [validateCondition],
  );

  const updateSeo = useCallback(
    (lang: Language, field: string, value: string) => {
      setConditionData((prev) => {
        if (!prev) return prev;
        const updated: ConditionData = {
          ...prev,
          [lang]: {
            ...prev[lang],
            updatedAt: new Date().toISOString(),
            seo: { ...prev[lang].seo, [field]: value },
          },
        };
        validateCondition(updated);
        return updated;
      });
    },
    [validateCondition],
  );

  // --- Section operations (synced across languages) ---

  const addSection = useCallback(
    (type: InfoSection["type"]) => {
      setConditionData((prev) => {
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
        validateCondition(updated);
        return updated;
      });
    },
    [validateCondition],
  );

  const deleteSection = useCallback(
    (idx: number) => {
      setConditionData((prev) => {
        if (!prev) return prev;
        const now = new Date().toISOString();
        const updated = { ...prev };
        for (const lang of LANGUAGES) {
          updated[lang] = {
            ...prev[lang],
            updatedAt: now,
            sections: prev[lang].sections.filter((_, i) => i !== idx),
          };
        }
        validateCondition(updated);
        return updated;
      });
    },
    [validateCondition],
  );

  const moveSection = useCallback(
    (idx: number, direction: "up" | "down") => {
      setConditionData((prev) => {
        if (!prev) return prev;
        const target = direction === "up" ? idx - 1 : idx + 1;
        if (target < 0 || target >= prev.en.sections.length) return prev;
        const now = new Date().toISOString();
        const updated = { ...prev };
        for (const lang of LANGUAGES) {
          const sections = [...prev[lang].sections];
          [sections[idx], sections[target]] = [sections[target], sections[idx]];
          updated[lang] = { ...prev[lang], updatedAt: now, sections };
        }
        validateCondition(updated);
        return updated;
      });
    },
    [validateCondition],
  );

  const updateSectionField = useCallback(
    (lang: Language, idx: number, field: string, value: string) => {
      setConditionData((prev) => {
        if (!prev) return prev;
        const sections = [...prev[lang].sections];
        sections[idx] = { ...sections[idx], [field]: value } as InfoSection;
        const updated: ConditionData = {
          ...prev,
          [lang]: { ...prev[lang], updatedAt: new Date().toISOString(), sections },
        };
        validateCondition(updated);
        return updated;
      });
    },
    [validateCondition],
  );

  // Bullet item operations
  const updateBulletItem = useCallback(
    (lang: Language, sectionIndex: number, itemIndex: number, value: string) => {
      setConditionData((prev) => {
        if (!prev) return prev;
        const sections = [...prev[lang].sections];
        const section = sections[sectionIndex];
        if (section.type !== "bullets") return prev;
        const items = [...section.items];
        items[itemIndex] = value;
        sections[sectionIndex] = { ...section, items };
        const updated: ConditionData = {
          ...prev,
          [lang]: { ...prev[lang], updatedAt: new Date().toISOString(), sections },
        };
        validateCondition(updated);
        return updated;
      });
    },
    [validateCondition],
  );

  const addBulletItem = useCallback(
    (sectionIndex: number) => {
      setConditionData((prev) => {
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
        validateCondition(updated);
        return updated;
      });
    },
    [validateCondition],
  );

  const deleteBulletItem = useCallback(
    (sectionIndex: number, itemIndex: number) => {
      setConditionData((prev) => {
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
        validateCondition(updated);
        return updated;
      });
    },
    [validateCondition],
  );

  // --- Contraindications operations ---

  const addContraindication = useCallback(() => {
    setConditionData((prev) => {
      if (!prev) return prev;
      const now = new Date().toISOString();
      const updated = { ...prev };
      for (const lang of LANGUAGES) {
        updated[lang] = {
          ...prev[lang],
          updatedAt: now,
          contraindications: [...prev[lang].contraindications, ""],
        };
      }
      return updated;
    });
  }, []);

  const deleteContraindication = useCallback(
    (idx: number) => {
      setConditionData((prev) => {
        if (!prev) return prev;
        const now = new Date().toISOString();
        const updated = { ...prev };
        for (const lang of LANGUAGES) {
          updated[lang] = {
            ...prev[lang],
            updatedAt: now,
            contraindications: prev[lang].contraindications.filter((_, i) => i !== idx),
          };
        }
        validateCondition(updated);
        return updated;
      });
    },
    [validateCondition],
  );

  const updateContraindication = useCallback(
    (lang: Language, idx: number, value: string) => {
      setConditionData((prev) => {
        if (!prev) return prev;
        const contraindications = [...prev[lang].contraindications];
        contraindications[idx] = value;
        const updated: ConditionData = {
          ...prev,
          [lang]: { ...prev[lang], updatedAt: new Date().toISOString(), contraindications },
        };
        validateCondition(updated);
        return updated;
      });
    },
    [validateCondition],
  );

  // --- FAQ operations ---

  const addFaq = useCallback(() => {
    setConditionData((prev) => {
      if (!prev) return prev;
      const now = new Date().toISOString();
      const updated = { ...prev };
      for (const lang of LANGUAGES) {
        updated[lang] = {
          ...prev[lang],
          updatedAt: now,
          faq: [...prev[lang].faq, { q: "", a: "" }],
        };
      }
      return updated;
    });
  }, []);

  const deleteFaq = useCallback(
    (idx: number) => {
      setConditionData((prev) => {
        if (!prev) return prev;
        const now = new Date().toISOString();
        const updated = { ...prev };
        for (const lang of LANGUAGES) {
          updated[lang] = {
            ...prev[lang],
            updatedAt: now,
            faq: prev[lang].faq.filter((_, i) => i !== idx),
          };
        }
        validateCondition(updated);
        return updated;
      });
    },
    [validateCondition],
  );

  const updateFaq = useCallback(
    (lang: Language, idx: number, field: "q" | "a", value: string) => {
      setConditionData((prev) => {
        if (!prev) return prev;
        const faq = [...prev[lang].faq];
        faq[idx] = { ...faq[idx], [field]: value };
        const updated: ConditionData = {
          ...prev,
          [lang]: { ...prev[lang], updatedAt: new Date().toISOString(), faq },
        };
        validateCondition(updated);
        return updated;
      });
    },
    [validateCondition],
  );

  const goToList = useCallback(() => {
    setView("list");
    setEditingSlug(null);
    setConditionData(null);
    setValidationErrors({});
    setShowDraftRecovery(false);
    setPendingServerCondition(null);
  }, []);

  // --- Render ---

  if (loadingState === "loading") {
    return (
      <AdminCard title="Conditions">
        <p className="text-muted-foreground" data-testid="conditions-loading">Loading conditions...</p>
      </AdminCard>
    );
  }

  if (loadingState === "error") {
    return (
      <AdminCard title="Conditions">
        <p className="text-red-600 dark:text-red-400" data-testid="conditions-error">{error}</p>
        <AdminButton variant="secondary" size="sm" onClick={loadIndex} className="mt-2">Retry</AdminButton>
      </AdminCard>
    );
  }

  if (!index) return null;

  // --- Edit view ---
  if (view === "edit" && editingSlug) {
    if (showDraftRecovery) {
      return (
        <div className="space-y-4" data-testid="conditions-editor-edit">
          <AdminButton variant="secondary" size="sm" onClick={goToList} data-testid="back-to-list">&larr; Back to list</AdminButton>
          <AdminCard title={`Edit: ${editingSlug}`}>
            <DraftRecoveryDialog onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />
          </AdminCard>
        </div>
      );
    }

    if (!conditionData) {
      return (
        <div className="space-y-4">
          <AdminButton variant="secondary" size="sm" onClick={goToList}>&larr; Back to list</AdminButton>
          <AdminCard title={`Edit: ${editingSlug}`}>
            <p className="text-muted-foreground">Loading condition...</p>
          </AdminCard>
        </div>
      );
    }

    const langCondition = conditionData[activeLang];

    return (
      <div className="space-y-6" data-testid="conditions-editor-edit">
        <div className="flex items-center gap-3">
          <AdminButton variant="secondary" size="sm" onClick={goToList} data-testid="back-to-list">&larr; Back</AdminButton>
          <h2 className="text-lg font-semibold text-foreground">Edit: {editingSlug}</h2>
          <DraftIndicator visible={isDirty} />
        </div>

        <LanguageTabs activeLang={activeLang} onLangChange={setActiveLang} />

        <AdminInput
          label="Title"
          id={`condition-title-${activeLang}`}
          value={langCondition.title}
          onChange={(e) => updateField(activeLang, "title", e.target.value)}
          error={validationErrors[`${activeLang}.title`]}
          data-testid={`condition-title-${activeLang}`}
        />

        <AdminTextarea
          label="Introduction"
          id={`condition-intro-${activeLang}`}
          value={langCondition.intro}
          onChange={(e) => updateField(activeLang, "intro", e.target.value)}
          rows={3}
          error={validationErrors[`${activeLang}.intro`]}
          data-testid={`condition-intro-${activeLang}`}
        />

        {/* SEO */}
        <div className="space-y-3 rounded-lg border border-border p-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">SEO</h3>
          <AdminInput
            label="SEO Title"
            id={`condition-seo-title-${activeLang}`}
            value={langCondition.seo.title}
            onChange={(e) => updateSeo(activeLang, "title", e.target.value)}
            error={validationErrors[`${activeLang}.seo.title`]}
            data-testid={`condition-seo-title-${activeLang}`}
          />
          <AdminInput
            label="SEO Description"
            id={`condition-seo-description-${activeLang}`}
            value={langCondition.seo.description}
            onChange={(e) => updateSeo(activeLang, "description", e.target.value)}
            error={validationErrors[`${activeLang}.seo.description`]}
            data-testid={`condition-seo-description-${activeLang}`}
          />
        </div>

        {/* Sections */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Sections ({langCondition.sections.length})
          </h3>

          {validationErrors[`${activeLang}.sections`] && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {validationErrors[`${activeLang}.sections`]}
            </p>
          )}

          {langCondition.sections.map((section, idx) => (
            <div key={idx} className="rounded-lg border border-border p-3 space-y-3" data-testid={`condition-section-${idx}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {section.type} #{idx + 1}
                </span>
                <div className="flex gap-1">
                  <AdminButton variant="secondary" size="sm" onClick={() => moveSection(idx, "up")} disabled={idx === 0} data-testid={`condition-section-${idx}-up`}>&uarr;</AdminButton>
                  <AdminButton variant="secondary" size="sm" onClick={() => moveSection(idx, "down")} disabled={idx === langCondition.sections.length - 1} data-testid={`condition-section-${idx}-down`}>&darr;</AdminButton>
                  <AdminButton variant="danger" size="sm" onClick={() => deleteSection(idx)} data-testid={`condition-section-${idx}-delete`}>Delete</AdminButton>
                </div>
              </div>

              {section.type === "text" && (
                <div className="space-y-2">
                  <AdminInput
                    label="Title (optional)"
                    id={`condition-section-${idx}-title-${activeLang}`}
                    value={section.title ?? ""}
                    onChange={(e) => updateSectionField(activeLang, idx, "title", e.target.value)}
                    data-testid={`condition-section-${idx}-title-${activeLang}`}
                  />
                  <AdminTextarea
                    label="Content"
                    id={`condition-section-${idx}-content-${activeLang}`}
                    value={section.content}
                    onChange={(e) => updateSectionField(activeLang, idx, "content", e.target.value)}
                    rows={4}
                    error={validationErrors[`${activeLang}.sections.${idx}.content`]}
                    data-testid={`condition-section-${idx}-content-${activeLang}`}
                  />
                </div>
              )}

              {section.type === "bullets" && (
                <div className="space-y-2">
                  <AdminInput
                    label="Title (optional)"
                    id={`condition-section-${idx}-title-${activeLang}`}
                    value={section.title ?? ""}
                    onChange={(e) => updateSectionField(activeLang, idx, "title", e.target.value)}
                    data-testid={`condition-section-${idx}-title-${activeLang}`}
                  />
                  <div className="space-y-2">
                    {section.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex gap-2">
                        <div className="flex-1">
                          <AdminInput
                            label={`Item ${itemIdx + 1}`}
                            id={`condition-section-${idx}-item-${itemIdx}-${activeLang}`}
                            value={item}
                            onChange={(e) => updateBulletItem(activeLang, idx, itemIdx, e.target.value)}
                            error={validationErrors[`${activeLang}.sections.${idx}.items.${itemIdx}`]}
                            data-testid={`condition-section-${idx}-item-${itemIdx}-${activeLang}`}
                          />
                        </div>
                        <div className="pt-6">
                          <AdminButton
                            variant="danger"
                            size="sm"
                            onClick={() => deleteBulletItem(idx, itemIdx)}
                            disabled={section.items.length <= 1}
                            data-testid={`condition-section-${idx}-item-${itemIdx}-delete`}
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
                      data-testid={`condition-section-${idx}-add-item`}
                    >
                      + Add item
                    </AdminButton>
                  </div>
                </div>
              )}

              {section.type === "image" && (
                <div className="space-y-2">
                  <ImagePicker
                    label="Image"
                    value={section.imagePath}
                    onChange={(path) => updateSectionField(activeLang, idx, "imagePath", path)}
                    data-testid={`condition-section-${idx}-imagePath-${activeLang}`}
                  />
                  <AdminInput
                    label="Caption (optional)"
                    id={`condition-section-${idx}-caption-${activeLang}`}
                    value={section.caption ?? ""}
                    onChange={(e) => updateSectionField(activeLang, idx, "caption", e.target.value)}
                    data-testid={`condition-section-${idx}-caption-${activeLang}`}
                  />
                </div>
              )}
            </div>
          ))}

          <div className="flex flex-wrap gap-2 rounded-lg border border-dashed border-border p-3" data-testid="condition-add-section-bar">
            <span className="text-sm text-muted-foreground self-center mr-2">Add section:</span>
            {SECTION_TYPES.map(({ value, label }) => (
              <AdminButton
                key={value}
                variant="secondary"
                size="sm"
                onClick={() => addSection(value)}
                data-testid={`condition-add-section-${value}`}
              >
                + {label}
              </AdminButton>
            ))}
          </div>
        </div>

        {/* Contraindications */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Contraindications ({langCondition.contraindications.length})
          </h3>

          {langCondition.contraindications.map((item, idx) => (
            <div key={idx} className="flex gap-2" data-testid={`condition-contraindication-${idx}`}>
              <div className="flex-1">
                <AdminInput
                  label={`Contraindication ${idx + 1}`}
                  id={`condition-contraindication-${idx}-${activeLang}`}
                  value={item}
                  onChange={(e) => updateContraindication(activeLang, idx, e.target.value)}
                  error={validationErrors[`${activeLang}.contraindications.${idx}`]}
                  data-testid={`condition-contraindication-${idx}-${activeLang}`}
                />
              </div>
              <div className="pt-6">
                <AdminButton
                  variant="danger"
                  size="sm"
                  onClick={() => deleteContraindication(idx)}
                  data-testid={`condition-contraindication-${idx}-delete`}
                >
                  &times;
                </AdminButton>
              </div>
            </div>
          ))}

          <AdminButton
            variant="secondary"
            size="sm"
            onClick={addContraindication}
            data-testid="condition-add-contraindication"
          >
            + Add contraindication
          </AdminButton>
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            FAQ ({langCondition.faq.length})
          </h3>

          {langCondition.faq.map((faqItem, idx) => (
            <div key={idx} className="rounded-lg border border-border p-3 space-y-2" data-testid={`condition-faq-${idx}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  FAQ #{idx + 1}
                </span>
                <AdminButton
                  variant="danger"
                  size="sm"
                  onClick={() => deleteFaq(idx)}
                  data-testid={`condition-faq-${idx}-delete`}
                >
                  Delete
                </AdminButton>
              </div>
              <AdminInput
                label="Question"
                id={`condition-faq-${idx}-q-${activeLang}`}
                value={faqItem.q}
                onChange={(e) => updateFaq(activeLang, idx, "q", e.target.value)}
                error={validationErrors[`${activeLang}.faq.${idx}.q`]}
                data-testid={`condition-faq-${idx}-q-${activeLang}`}
              />
              <AdminTextarea
                label="Answer"
                id={`condition-faq-${idx}-a-${activeLang}`}
                value={faqItem.a}
                onChange={(e) => updateFaq(activeLang, idx, "a", e.target.value)}
                rows={3}
                error={validationErrors[`${activeLang}.faq.${idx}.a`]}
                data-testid={`condition-faq-${idx}-a-${activeLang}`}
              />
            </div>
          ))}

          <AdminButton
            variant="secondary"
            size="sm"
            onClick={addFaq}
            data-testid="condition-add-faq"
          >
            + Add FAQ
          </AdminButton>
        </div>
      </div>
    );
  }

  // --- List view ---
  return (
    <div className="space-y-4" data-testid="conditions-editor-list">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">Conditions</h2>
        <DraftIndicator visible={isDirty} />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Condition list */}
      <div className="space-y-2">
        {index.items.length === 0 && (
          <p className="text-sm text-muted-foreground">No conditions yet. Create one below.</p>
        )}

        {index.items.map((item, idx) => (
          <div
            key={item.slug}
            className="flex items-center gap-3 rounded-lg border border-border p-3"
            data-testid={`condition-item-${item.slug}`}
          >
            <div className="flex flex-col gap-1 sm:hidden">
              <AdminButton variant="secondary" size="sm" onClick={() => moveCondition(idx, "up")} disabled={idx === 0}>&uarr;</AdminButton>
              <AdminButton variant="secondary" size="sm" onClick={() => moveCondition(idx, "down")} disabled={idx === index.items.length - 1}>&darr;</AdminButton>
            </div>
            <div className="hidden sm:flex gap-1">
              <AdminButton variant="secondary" size="sm" onClick={() => moveCondition(idx, "up")} disabled={idx === 0} data-testid={`condition-${item.slug}-up`}>&uarr;</AdminButton>
              <AdminButton variant="secondary" size="sm" onClick={() => moveCondition(idx, "down")} disabled={idx === index.items.length - 1} data-testid={`condition-${item.slug}-down`}>&darr;</AdminButton>
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{item.slug}</div>
              <div className="text-xs text-muted-foreground">#{item.order}</div>
            </div>

            <button
              onClick={() => togglePublished(item.slug)}
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                item.published
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}
              data-testid={`condition-${item.slug}-published`}
            >
              {item.published ? "Published" : "Draft"}
            </button>

            <div className="flex gap-1">
              <AdminButton variant="secondary" size="sm" onClick={() => loadCondition(item.slug)} data-testid={`condition-${item.slug}-edit`}>
                Edit
              </AdminButton>
              {deleteConfirmSlug === item.slug ? (
                <div className="flex gap-1">
                  <AdminButton variant="danger" size="sm" onClick={() => deleteCondition(item.slug)} data-testid={`condition-${item.slug}-confirm-delete`}>
                    Confirm
                  </AdminButton>
                  <AdminButton variant="secondary" size="sm" onClick={() => setDeleteConfirmSlug(null)}>
                    Cancel
                  </AdminButton>
                </div>
              ) : (
                <AdminButton variant="danger" size="sm" onClick={() => setDeleteConfirmSlug(item.slug)} data-testid={`condition-${item.slug}-delete`}>
                  Delete
                </AdminButton>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create condition */}
      <div className="rounded-lg border border-dashed border-border p-3 space-y-3" data-testid="create-condition-form">
        <h3 className="text-sm font-semibold text-foreground">Create new condition</h3>
        <AdminInput
          label="Slug"
          id="new-condition-slug"
          value={newSlug}
          onChange={(e) => { setNewSlug(e.target.value); setCreateError(null); }}
          placeholder="e.g. back-pain"
          error={createError ?? undefined}
          data-testid="new-condition-slug"
        />
        <AdminButton
          variant="primary"
          size="sm"
          onClick={createCondition}
          disabled={!newSlug.trim()}
          data-testid="create-condition-button"
        >
          Create condition
        </AdminButton>
      </div>
    </div>
  );
}
