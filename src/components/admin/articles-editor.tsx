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
import { ArticleSchema, ArticlesIndexSchema } from "@/schemas";
import type { Article, ArticlesIndex, ArticleSection } from "@/schemas";
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

const INDEX_DRAFT_KEY = "content/articles/index.json";

function articleDraftKey(slug: string, lang: Language): string {
  return `content/articles/${slug}/article.${lang}.json`;
}

type LoadingState = "idle" | "loading" | "loaded" | "error";
type View = "list" | "edit";

interface ArticleData {
  en: Article;
  lv: Article;
  ru: Article;
}

function createEmptyArticle(id: string, slug: string): Article {
  return {
    id,
    slug,
    updatedAt: new Date().toISOString(),
    seo: { title: "", description: "" },
    title: "",
    excerpt: "",
    sections: [{ type: "text", content: "" }],
  };
}

function createEmptySection(type: ArticleSection["type"]): ArticleSection {
  if (type === "image") return { type: "image", imagePath: "", caption: "" };
  return { type: "text", content: "" };
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function ArticlesEditor() {
  const { token } = useAdminAuth();
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState<ArticlesIndex | null>(null);
  const [view, setView] = useState<View>("list");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [activeLang, setActiveLang] = useState<Language>("en");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [pendingServerArticle, setPendingServerArticle] = useState<ArticleData | null>(null);

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
        dirty.includes(articleDraftKey(editingSlug, lang)),
      );
    }
    return false;
  }, [index, articleData, editingSlug]);

  const cm = useMemo(() => {
    if (!token) return null;
    return createContentManager(token);
  }, [token]);

  // Autosave index
  useEffect(() => {
    if (!index) return;
    saveDraft(INDEX_DRAFT_KEY, index);
  }, [index]);

  // Autosave article
  useEffect(() => {
    if (!articleData || !editingSlug) return;
    for (const lang of LANGUAGES) {
      saveDraft(articleDraftKey(editingSlug, lang), articleData[lang]);
    }
  }, [articleData, editingSlug]);

  const loadIndex = useCallback(async () => {
    if (!cm) return;
    setLoadingState("loading");
    setError(null);
    try {
      const data = await cm.loadArticlesIndex();
      setOriginal(INDEX_DRAFT_KEY, data);
      setIndex(data);
      setLoadingState("loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load articles index");
      setLoadingState("error");
    }
  }, [cm]);

  useEffect(() => {
    if (loadingState === "idle" && cm) {
      loadIndex();
    }
  }, [loadIndex, loadingState, cm]);

  // Load article for editing
  const loadArticle = useCallback(
    async (slug: string) => {
      if (!cm) return;
      setError(null);
      try {
        const [en, lv, ru] = await Promise.all([
          cm.loadArticle(slug, "en"),
          cm.loadArticle(slug, "lv"),
          cm.loadArticle(slug, "ru"),
        ]);
        const serverData: ArticleData = { en, lv, ru };
        for (const lang of LANGUAGES) {
          setOriginal(articleDraftKey(slug, lang), serverData[lang]);
        }

        const hasDrafts = LANGUAGES.some((lang) =>
          hasDraft(articleDraftKey(slug, lang)),
        );
        if (hasDrafts) {
          setPendingServerArticle(serverData);
          setShowDraftRecovery(true);
        } else {
          setArticleData(serverData);
        }
        setEditingSlug(slug);
        setView("edit");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load article");
      }
    },
    [cm],
  );

  // Draft recovery
  const handleRestoreDraft = useCallback(() => {
    if (!editingSlug) return;
    const restored: ArticleData = {
      en: loadDraft<Article>(articleDraftKey(editingSlug, "en")) ?? pendingServerArticle?.en ?? createEmptyArticle("", editingSlug),
      lv: loadDraft<Article>(articleDraftKey(editingSlug, "lv")) ?? pendingServerArticle?.lv ?? createEmptyArticle("", editingSlug),
      ru: loadDraft<Article>(articleDraftKey(editingSlug, "ru")) ?? pendingServerArticle?.ru ?? createEmptyArticle("", editingSlug),
    };
    setArticleData(restored);
    setShowDraftRecovery(false);
    setPendingServerArticle(null);
  }, [editingSlug, pendingServerArticle]);

  const handleDiscardDraft = useCallback(() => {
    if (pendingServerArticle) {
      setArticleData(pendingServerArticle);
    }
    setShowDraftRecovery(false);
    setPendingServerArticle(null);
  }, [pendingServerArticle]);

  // Validate article
  const validateArticle = useCallback((d: ArticleData): boolean => {
    const errors: Record<string, string> = {};
    let valid = true;
    for (const lang of LANGUAGES) {
      const result = ArticleSchema.safeParse(d[lang]);
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

  const createArticle = useCallback(() => {
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

    const id = `article-${Date.now()}`;
    const now = new Date().toISOString();
    const newIndex: ArticlesIndex = {
      ...index,
      updatedAt: now,
      items: [
        ...index.items,
        { id, slug, published: false, order: index.items.length + 1 },
      ],
    };
    setIndex(newIndex);

    // Create empty article drafts for all languages
    for (const lang of LANGUAGES) {
      const empty = createEmptyArticle(id, slug);
      saveDraft(articleDraftKey(slug, lang), empty);
    }

    setNewSlug("");
    setCreateError(null);
  }, [newSlug, index]);

  const deleteArticle = useCallback(
    (slug: string) => {
      if (!index) return;
      const newIndex: ArticlesIndex = {
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
      const newIndex: ArticlesIndex = {
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

  const moveArticle = useCallback(
    (idx: number, direction: "up" | "down") => {
      if (!index) return;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= index.items.length) return;
      const items = [...index.items];
      [items[idx], items[target]] = [items[target], items[idx]];
      // Recalculate order
      const reordered = items.map((item, i) => ({ ...item, order: i + 1 }));
      setIndex({ ...index, updatedAt: new Date().toISOString(), items: reordered });
    },
    [index],
  );

  // --- Article edit operations ---

  const updateArticleField = useCallback(
    (lang: Language, field: string, value: string) => {
      setArticleData((prev) => {
        if (!prev) return prev;
        const updated: ArticleData = {
          ...prev,
          [lang]: { ...prev[lang], updatedAt: new Date().toISOString(), [field]: value },
        };
        validateArticle(updated);
        return updated;
      });
    },
    [validateArticle],
  );

  const updateArticleSeo = useCallback(
    (lang: Language, field: string, value: string) => {
      setArticleData((prev) => {
        if (!prev) return prev;
        const updated: ArticleData = {
          ...prev,
          [lang]: {
            ...prev[lang],
            updatedAt: new Date().toISOString(),
            seo: { ...prev[lang].seo, [field]: value },
          },
        };
        validateArticle(updated);
        return updated;
      });
    },
    [validateArticle],
  );

  // Section operations (synced across languages)
  const addSection = useCallback(
    (type: ArticleSection["type"]) => {
      setArticleData((prev) => {
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
        validateArticle(updated);
        return updated;
      });
    },
    [validateArticle],
  );

  const deleteSection = useCallback(
    (idx: number) => {
      setArticleData((prev) => {
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
        validateArticle(updated);
        return updated;
      });
    },
    [validateArticle],
  );

  const moveSection = useCallback(
    (idx: number, direction: "up" | "down") => {
      setArticleData((prev) => {
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
        validateArticle(updated);
        return updated;
      });
    },
    [validateArticle],
  );

  const updateSectionField = useCallback(
    (lang: Language, idx: number, field: string, value: string) => {
      setArticleData((prev) => {
        if (!prev) return prev;
        const sections = [...prev[lang].sections];
        sections[idx] = { ...sections[idx], [field]: value } as ArticleSection;
        const updated: ArticleData = {
          ...prev,
          [lang]: { ...prev[lang], updatedAt: new Date().toISOString(), sections },
        };
        validateArticle(updated);
        return updated;
      });
    },
    [validateArticle],
  );

  const goToList = useCallback(() => {
    setView("list");
    setEditingSlug(null);
    setArticleData(null);
    setValidationErrors({});
    setShowDraftRecovery(false);
    setPendingServerArticle(null);
  }, []);

  // --- Render ---

  if (loadingState === "loading") {
    return (
      <AdminCard title="Articles">
        <p className="text-muted-foreground" data-testid="articles-loading">Loading articles...</p>
      </AdminCard>
    );
  }

  if (loadingState === "error") {
    return (
      <AdminCard title="Articles">
        <p className="text-red-600 dark:text-red-400" data-testid="articles-error">{error}</p>
        <AdminButton variant="secondary" size="sm" onClick={loadIndex} className="mt-2">Retry</AdminButton>
      </AdminCard>
    );
  }

  if (!index) return null;

  // --- Edit view ---
  if (view === "edit" && editingSlug) {
    if (showDraftRecovery) {
      return (
        <div className="space-y-4" data-testid="articles-editor-edit">
          <AdminButton variant="secondary" size="sm" onClick={goToList} data-testid="back-to-list">&larr; Back to list</AdminButton>
          <AdminCard title={`Edit: ${editingSlug}`}>
            <DraftRecoveryDialog onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />
          </AdminCard>
        </div>
      );
    }

    if (!articleData) {
      return (
        <div className="space-y-4">
          <AdminButton variant="secondary" size="sm" onClick={goToList}>&larr; Back to list</AdminButton>
          <AdminCard title={`Edit: ${editingSlug}`}>
            <p className="text-muted-foreground">Loading article...</p>
          </AdminCard>
        </div>
      );
    }

    const langArticle = articleData[activeLang];

    return (
      <div className="space-y-6" data-testid="articles-editor-edit">
        <div className="flex items-center gap-3">
          <AdminButton variant="secondary" size="sm" onClick={goToList} data-testid="back-to-list">&larr; Back</AdminButton>
          <h2 className="text-lg font-semibold text-foreground">Edit: {editingSlug}</h2>
          <DraftIndicator visible={isDirty} />
        </div>

        <LanguageTabs activeLang={activeLang} onLangChange={setActiveLang} />

        <AdminInput
          label="Title"
          id={`article-title-${activeLang}`}
          value={langArticle.title}
          onChange={(e) => updateArticleField(activeLang, "title", e.target.value)}
          error={validationErrors[`${activeLang}.title`]}
          data-testid={`article-title-${activeLang}`}
        />

        <AdminTextarea
          label="Excerpt (max 280 chars)"
          id={`article-excerpt-${activeLang}`}
          value={langArticle.excerpt}
          onChange={(e) => updateArticleField(activeLang, "excerpt", e.target.value)}
          rows={3}
          error={validationErrors[`${activeLang}.excerpt`]}
          data-testid={`article-excerpt-${activeLang}`}
        />

        <ImagePicker
          label="Hero Image (optional)"
          value={langArticle.heroImagePath ?? ""}
          onChange={(path) => updateArticleField(activeLang, "heroImagePath", path)}
          data-testid={`article-heroImagePath-${activeLang}`}
        />

        {/* SEO */}
        <div className="space-y-3 rounded-lg border border-border p-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">SEO</h3>
          <AdminInput
            label="SEO Title"
            id={`article-seo-title-${activeLang}`}
            value={langArticle.seo.title}
            onChange={(e) => updateArticleSeo(activeLang, "title", e.target.value)}
            error={validationErrors[`${activeLang}.seo.title`]}
            data-testid={`article-seo-title-${activeLang}`}
          />
          <AdminInput
            label="SEO Description"
            id={`article-seo-description-${activeLang}`}
            value={langArticle.seo.description}
            onChange={(e) => updateArticleSeo(activeLang, "description", e.target.value)}
            error={validationErrors[`${activeLang}.seo.description`]}
            data-testid={`article-seo-description-${activeLang}`}
          />
        </div>

        {/* Sections */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Sections ({langArticle.sections.length})
          </h3>

          {langArticle.sections.map((section, idx) => (
            <div key={idx} className="rounded-lg border border-border p-3 space-y-3" data-testid={`article-section-${idx}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {section.type} #{idx + 1}
                </span>
                <div className="flex gap-1">
                  <AdminButton variant="secondary" size="sm" onClick={() => moveSection(idx, "up")} disabled={idx === 0} data-testid={`article-section-${idx}-up`}>&uarr;</AdminButton>
                  <AdminButton variant="secondary" size="sm" onClick={() => moveSection(idx, "down")} disabled={idx === langArticle.sections.length - 1} data-testid={`article-section-${idx}-down`}>&darr;</AdminButton>
                  <AdminButton variant="danger" size="sm" onClick={() => deleteSection(idx)} data-testid={`article-section-${idx}-delete`}>Delete</AdminButton>
                </div>
              </div>

              {section.type === "text" && (
                <AdminTextarea
                  label="Content"
                  id={`article-section-${idx}-content-${activeLang}`}
                  value={section.content}
                  onChange={(e) => updateSectionField(activeLang, idx, "content", e.target.value)}
                  rows={4}
                  error={validationErrors[`${activeLang}.sections.${idx}.content`]}
                  data-testid={`article-section-${idx}-content-${activeLang}`}
                />
              )}

              {section.type === "image" && (
                <div className="space-y-2">
                  <ImagePicker
                    label="Image"
                    value={section.imagePath}
                    onChange={(path) => updateSectionField(activeLang, idx, "imagePath", path)}
                    data-testid={`article-section-${idx}-imagePath-${activeLang}`}
                  />
                  <AdminInput
                    label="Caption (optional)"
                    id={`article-section-${idx}-caption-${activeLang}`}
                    value={section.caption ?? ""}
                    onChange={(e) => updateSectionField(activeLang, idx, "caption", e.target.value)}
                    data-testid={`article-section-${idx}-caption-${activeLang}`}
                  />
                </div>
              )}
            </div>
          ))}

          <div className="flex flex-wrap gap-2 rounded-lg border border-dashed border-border p-3" data-testid="article-add-section-bar">
            <span className="text-sm text-muted-foreground self-center mr-2">Add section:</span>
            <AdminButton variant="secondary" size="sm" onClick={() => addSection("text")} data-testid="article-add-section-text">+ Text</AdminButton>
            <AdminButton variant="secondary" size="sm" onClick={() => addSection("image")} data-testid="article-add-section-image">+ Image</AdminButton>
          </div>
        </div>
      </div>
    );
  }

  // --- List view ---
  return (
    <div className="space-y-4" data-testid="articles-editor-list">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">Articles</h2>
        <DraftIndicator visible={isDirty} />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Article list */}
      <div className="space-y-2">
        {index.items.length === 0 && (
          <p className="text-sm text-muted-foreground">No articles yet. Create one below.</p>
        )}

        {index.items.map((item, idx) => (
          <div
            key={item.slug}
            className="flex items-center gap-3 rounded-lg border border-border p-3"
            data-testid={`article-item-${item.slug}`}
          >
            <div className="flex flex-col gap-1 sm:hidden">
              <AdminButton variant="secondary" size="sm" onClick={() => moveArticle(idx, "up")} disabled={idx === 0}>&uarr;</AdminButton>
              <AdminButton variant="secondary" size="sm" onClick={() => moveArticle(idx, "down")} disabled={idx === index.items.length - 1}>&darr;</AdminButton>
            </div>
            <div className="hidden sm:flex gap-1">
              <AdminButton variant="secondary" size="sm" onClick={() => moveArticle(idx, "up")} disabled={idx === 0} data-testid={`article-${item.slug}-up`}>&uarr;</AdminButton>
              <AdminButton variant="secondary" size="sm" onClick={() => moveArticle(idx, "down")} disabled={idx === index.items.length - 1} data-testid={`article-${item.slug}-down`}>&darr;</AdminButton>
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
              data-testid={`article-${item.slug}-published`}
            >
              {item.published ? "Published" : "Draft"}
            </button>

            <div className="flex gap-1">
              <AdminButton variant="secondary" size="sm" onClick={() => loadArticle(item.slug)} data-testid={`article-${item.slug}-edit`}>
                Edit
              </AdminButton>
              {deleteConfirmSlug === item.slug ? (
                <div className="flex gap-1">
                  <AdminButton variant="danger" size="sm" onClick={() => deleteArticle(item.slug)} data-testid={`article-${item.slug}-confirm-delete`}>
                    Confirm
                  </AdminButton>
                  <AdminButton variant="secondary" size="sm" onClick={() => setDeleteConfirmSlug(null)}>
                    Cancel
                  </AdminButton>
                </div>
              ) : (
                <AdminButton variant="danger" size="sm" onClick={() => setDeleteConfirmSlug(item.slug)} data-testid={`article-${item.slug}-delete`}>
                  Delete
                </AdminButton>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create article */}
      <div className="rounded-lg border border-dashed border-border p-3 space-y-3" data-testid="create-article-form">
        <h3 className="text-sm font-semibold text-foreground">Create new article</h3>
        <AdminInput
          label="Slug"
          id="new-article-slug"
          value={newSlug}
          onChange={(e) => { setNewSlug(e.target.value); setCreateError(null); }}
          placeholder="e.g. benefits-of-acupuncture"
          error={createError ?? undefined}
          data-testid="new-article-slug"
        />
        <AdminButton
          variant="primary"
          size="sm"
          onClick={createArticle}
          disabled={!newSlug.trim()}
          data-testid="create-article-button"
        >
          Create article
        </AdminButton>
      </div>
    </div>
  );
}
