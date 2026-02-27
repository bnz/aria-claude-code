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
import { TranslationsSchema } from "@/schemas";
import type { Translations } from "@/schemas";
import type { Language } from "@/schemas/languages";
import { LANGUAGES } from "@/schemas/languages";
import { AdminButton, AdminCard, AdminInput } from "@/components/admin/ui";
import { DraftRecoveryDialog } from "@/components/admin/draft-recovery-dialog";
import { DraftIndicator } from "@/components/admin/draft-indicator";

type TranslationGroup = "header" | "footer" | "buttons";

const GROUPS: { key: TranslationGroup; label: string }[] = [
  { key: "header", label: "Header" },
  { key: "footer", label: "Footer" },
  { key: "buttons", label: "Buttons" },
];

const DRAFT_KEYS: Record<Language, string> = {
  en: "content/translations.en.json",
  lv: "content/translations.lv.json",
  ru: "content/translations.ru.json",
};

type LoadingState = "idle" | "loading" | "loaded" | "error";

interface TranslationsData {
  en: Translations;
  lv: Translations;
  ru: Translations;
}

function getDefaultTranslations(lang: Language): Translations {
  return {
    id: "translations",
    updatedAt: new Date().toISOString(),
    header: {},
    footer: {},
    buttons: {},
  };
}

/**
 * Collect all unique keys across all 3 languages for a given group.
 */
function getAllKeysForGroup(
  data: TranslationsData,
  group: TranslationGroup,
): string[] {
  const keySet = new Set<string>();
  for (const lang of LANGUAGES) {
    const groupData = data[lang][group];
    if (groupData) {
      Object.keys(groupData).forEach((k) => keySet.add(k));
    }
  }
  return Array.from(keySet).sort();
}

export function TranslationsEditor() {
  const { token } = useAdminAuth();
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TranslationsData | null>(null);
  const [activeGroup, setActiveGroup] = useState<TranslationGroup>("header");
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [pendingServerData, setPendingServerData] = useState<TranslationsData | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // New key form
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValues, setNewKeyValues] = useState<Record<Language, string>>({
    en: "",
    lv: "",
    ru: "",
  });

  const isDirty = useMemo(() => {
    const dirty = getDirtyKeys();
    return LANGUAGES.some((lang) => dirty.includes(DRAFT_KEYS[lang]));
  }, [data]);

  const cm = useMemo(() => {
    if (!token) return null;
    return createContentManager(token);
  }, [token]);

  // Autosave to draft on every data change
  useEffect(() => {
    if (!data) return;
    for (const lang of LANGUAGES) {
      saveDraft(DRAFT_KEYS[lang], data[lang]);
    }
  }, [data]);

  // Validate data with Zod
  const validateData = useCallback((d: TranslationsData): boolean => {
    const errors: Record<string, string> = {};
    let valid = true;

    for (const lang of LANGUAGES) {
      const result = TranslationsSchema.safeParse(d[lang]);
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

  // Load data from GitHub
  const loadFromGitHub = useCallback(async () => {
    if (!cm) return;

    setLoadingState("loading");
    setError(null);

    try {
      const [en, lv, ru] = await Promise.all([
        cm.loadTranslations("en"),
        cm.loadTranslations("lv"),
        cm.loadTranslations("ru"),
      ]);

      const serverData: TranslationsData = { en, lv, ru };

      // Store originals for dirty tracking
      for (const lang of LANGUAGES) {
        setOriginal(DRAFT_KEYS[lang], serverData[lang]);
      }

      // Check for existing drafts
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
      setError(err instanceof Error ? err.message : "Failed to load translations");
      setLoadingState("error");
    }
  }, [cm]);

  // Load on mount
  useEffect(() => {
    if (loadingState === "idle" && cm) {
      loadFromGitHub();
    }
  }, [loadFromGitHub, loadingState, cm]);

  // Draft recovery handlers
  const handleRestoreDraft = useCallback(() => {
    const restored: TranslationsData = {
      en: loadDraft<Translations>(DRAFT_KEYS.en) ?? pendingServerData?.en ?? getDefaultTranslations("en"),
      lv: loadDraft<Translations>(DRAFT_KEYS.lv) ?? pendingServerData?.lv ?? getDefaultTranslations("lv"),
      ru: loadDraft<Translations>(DRAFT_KEYS.ru) ?? pendingServerData?.ru ?? getDefaultTranslations("ru"),
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

  // Update a single translation value
  const updateValue = useCallback(
    (lang: Language, group: TranslationGroup, key: string, value: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const updated: TranslationsData = {
          ...prev,
          [lang]: {
            ...prev[lang],
            updatedAt: new Date().toISOString(),
            [group]: {
              ...prev[lang][group],
              [key]: value,
            },
          },
        };
        validateData(updated);
        return updated;
      });
    },
    [validateData],
  );

  // Add a new key to the active group across all languages
  const addKey = useCallback(() => {
    const trimmedKey = newKeyName.trim();
    if (!trimmedKey || !data) return;

    // Check if key already exists in any language for this group
    const exists = LANGUAGES.some((lang) => trimmedKey in (data[lang][activeGroup] ?? {}));
    if (exists) {
      setValidationErrors((prev) => ({
        ...prev,
        newKey: `Key "${trimmedKey}" already exists in ${activeGroup}`,
      }));
      return;
    }

    setData((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      for (const lang of LANGUAGES) {
        updated[lang] = {
          ...prev[lang],
          updatedAt: new Date().toISOString(),
          [activeGroup]: {
            ...prev[lang][activeGroup],
            [trimmedKey]: newKeyValues[lang],
          },
        };
      }
      validateData(updated);
      return updated;
    });

    setNewKeyName("");
    setNewKeyValues({ en: "", lv: "", ru: "" });
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next.newKey;
      return next;
    });
  }, [newKeyName, newKeyValues, activeGroup, data, validateData]);

  // Delete a key from the active group across all languages
  const deleteKey = useCallback(
    (key: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        for (const lang of LANGUAGES) {
          const groupCopy = { ...prev[lang][activeGroup] };
          delete groupCopy[key];
          updated[lang] = {
            ...prev[lang],
            updatedAt: new Date().toISOString(),
            [activeGroup]: groupCopy,
          };
        }
        validateData(updated);
        return updated;
      });
    },
    [activeGroup, validateData],
  );

  // --- Render ---

  if (loadingState === "loading") {
    return (
      <AdminCard title="Translations">
        <p className="text-muted-foreground" data-testid="translations-loading">
          Loading translations...
        </p>
      </AdminCard>
    );
  }

  if (loadingState === "error") {
    return (
      <AdminCard title="Translations">
        <p className="text-red-600 dark:text-red-400" data-testid="translations-error">
          {error}
        </p>
        <AdminButton variant="secondary" size="sm" onClick={loadFromGitHub} className="mt-2">
          Retry
        </AdminButton>
      </AdminCard>
    );
  }

  if (showDraftRecovery) {
    return (
      <AdminCard title="Translations">
        <DraftRecoveryDialog onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />
      </AdminCard>
    );
  }

  if (!data) {
    return null;
  }

  const keys = getAllKeysForGroup(data, activeGroup);

  return (
    <div className="space-y-4" data-testid="translations-editor">
      {/* Header with dirty indicator */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">Translations</h2>
        <DraftIndicator visible={isDirty} />
      </div>

      {/* Group tabs */}
      <div
        className="flex gap-1 border-b border-border"
        role="tablist"
        aria-label="Translation groups"
      >
        {GROUPS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeGroup === key}
            onClick={() => setActiveGroup(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeGroup === key
                ? "text-accent border-b-2 border-accent"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`group-tab-${key}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Translation keys */}
      <div className="space-y-4">
        {keys.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No keys in this group. Add one below.
          </p>
        )}

        {keys.map((key) => (
          <div
            key={key}
            className="rounded-lg border border-border p-3 space-y-2"
            data-testid={`translation-key-${key}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-medium text-foreground">{key}</span>
              <AdminButton
                variant="danger"
                size="sm"
                onClick={() => deleteKey(key)}
                data-testid={`delete-key-${key}`}
              >
                Delete
              </AdminButton>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {LANGUAGES.map((lang) => (
                <AdminInput
                  key={lang}
                  label={lang.toUpperCase()}
                  id={`${activeGroup}-${key}-${lang}`}
                  value={data[lang][activeGroup]?.[key] ?? ""}
                  onChange={(e) => updateValue(lang, activeGroup, key, e.target.value)}
                  error={validationErrors[`${lang}.${activeGroup}.${key}`]}
                  data-testid={`input-${activeGroup}-${key}-${lang}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add new key */}
      <div
        className="rounded-lg border border-dashed border-border p-3 space-y-3"
        data-testid="add-key-form"
      >
        <h3 className="text-sm font-semibold text-foreground">Add new key</h3>

        <AdminInput
          label="Key name"
          id="new-key-name"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="e.g. myNewKey"
          error={validationErrors.newKey}
          data-testid="new-key-name-input"
        />

        <div className="grid gap-2 sm:grid-cols-3">
          {LANGUAGES.map((lang) => (
            <AdminInput
              key={lang}
              label={lang.toUpperCase()}
              id={`new-key-value-${lang}`}
              value={newKeyValues[lang]}
              onChange={(e) =>
                setNewKeyValues((prev) => ({ ...prev, [lang]: e.target.value }))
              }
              placeholder={`Value (${lang})`}
              data-testid={`new-key-value-${lang}`}
            />
          ))}
        </div>

        <AdminButton
          variant="secondary"
          size="sm"
          onClick={addKey}
          disabled={!newKeyName.trim()}
          data-testid="add-key-button"
        >
          Add key to {activeGroup}
        </AdminButton>
      </div>
    </div>
  );
}
