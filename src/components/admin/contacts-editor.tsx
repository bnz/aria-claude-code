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
import { ContactsSchema } from "@/schemas";
import type { Contacts } from "@/schemas";
import type { Language } from "@/schemas/languages";
import { LANGUAGES } from "@/schemas/languages";
import { AdminButton, AdminCard, AdminInput, AdminTextarea } from "@/components/admin/ui";
import { LanguageTabs } from "@/components/admin/language-tabs";
import { DraftRecoveryDialog } from "@/components/admin/draft-recovery-dialog";
import { DraftIndicator } from "@/components/admin/draft-indicator";

const DRAFT_KEYS: Record<Language, string> = {
  en: "content/contacts.en.json",
  lv: "content/contacts.lv.json",
  ru: "content/contacts.ru.json",
};

type LoadingState = "idle" | "loading" | "loaded" | "error";

interface ContactsData {
  en: Contacts;
  lv: Contacts;
  ru: Contacts;
}

function getDefaultContacts(): Contacts {
  return {
    id: "contacts",
    updatedAt: new Date().toISOString(),
    phone: "",
    address: "",
  };
}

export function ContactsEditor() {
  const { token } = useAdminAuth();
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ContactsData | null>(null);
  const [activeLang, setActiveLang] = useState<Language>("en");
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [pendingServerData, setPendingServerData] = useState<ContactsData | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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
  const validateData = useCallback((d: ContactsData): boolean => {
    const errors: Record<string, string> = {};
    let valid = true;

    for (const lang of LANGUAGES) {
      const result = ContactsSchema.safeParse(d[lang]);
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
        cm.loadContacts("en"),
        cm.loadContacts("lv"),
        cm.loadContacts("ru"),
      ]);

      const serverData: ContactsData = { en, lv, ru };

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
      setError(err instanceof Error ? err.message : "Failed to load contacts");
      setLoadingState("error");
    }
  }, [cm]);

  // Load on mount
  useEffect(() => {
    if (loadingState === "idle" && cm) {
      loadFromGitHub();
    }
  }, [loadFromGitHub, loadingState, cm]);

  // Draft recovery
  const handleRestoreDraft = useCallback(() => {
    const restored: ContactsData = {
      en: loadDraft<Contacts>(DRAFT_KEYS.en) ?? pendingServerData?.en ?? getDefaultContacts(),
      lv: loadDraft<Contacts>(DRAFT_KEYS.lv) ?? pendingServerData?.lv ?? getDefaultContacts(),
      ru: loadDraft<Contacts>(DRAFT_KEYS.ru) ?? pendingServerData?.ru ?? getDefaultContacts(),
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

  // Update a shared field (phone, mapEmbedUrl) — syncs to all languages
  const updateSharedField = useCallback(
    (field: "phone" | "mapEmbedUrl", value: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const now = new Date().toISOString();
        const updated: ContactsData = {
          en: { ...prev.en, updatedAt: now, [field]: value },
          lv: { ...prev.lv, updatedAt: now, [field]: value },
          ru: { ...prev.ru, updatedAt: now, [field]: value },
        };
        validateData(updated);
        return updated;
      });
    },
    [validateData],
  );

  // Update a per-language field
  const updateLangField = useCallback(
    (lang: Language, field: "address" | "introText" | "workHours", value: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const updated: ContactsData = {
          ...prev,
          [lang]: {
            ...prev[lang],
            updatedAt: new Date().toISOString(),
            [field]: value,
          },
        };
        validateData(updated);
        return updated;
      });
    },
    [validateData],
  );

  // --- Render ---

  if (loadingState === "loading") {
    return (
      <AdminCard title="Contacts">
        <p className="text-muted-foreground" data-testid="contacts-loading">
          Loading contacts...
        </p>
      </AdminCard>
    );
  }

  if (loadingState === "error") {
    return (
      <AdminCard title="Contacts">
        <p className="text-red-600 dark:text-red-400" data-testid="contacts-error">
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
      <AdminCard title="Contacts">
        <DraftRecoveryDialog onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />
      </AdminCard>
    );
  }

  if (!data) {
    return null;
  }

  const langData = data[activeLang];

  return (
    <div className="space-y-6" data-testid="contacts-editor">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">Contacts</h2>
        <DraftIndicator visible={isDirty} />
      </div>

      {/* Shared fields */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Shared (all languages)
        </h3>

        <AdminInput
          label="Phone"
          id="contacts-phone"
          value={data.en.phone}
          onChange={(e) => updateSharedField("phone", e.target.value)}
          placeholder="+371 20000000"
          error={validationErrors["en.phone"]}
          data-testid="contacts-phone"
        />

        <div className="space-y-1">
          <AdminInput
            label="Map Embed URL"
            id="contacts-mapEmbedUrl"
            value={data.en.mapEmbedUrl ?? ""}
            onChange={(e) => updateSharedField("mapEmbedUrl", e.target.value)}
            placeholder="https://www.google.com/maps/embed?..."
            error={validationErrors["en.mapEmbedUrl"]}
            data-testid="contacts-mapEmbedUrl"
          />

          {/* Map preview */}
          {data.en.mapEmbedUrl && (
            <div
              className="mt-2 overflow-hidden rounded-lg border border-border"
              data-testid="map-preview"
            >
              <iframe
                src={data.en.mapEmbedUrl}
                className="h-48 w-full"
                title="Map preview"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </div>
      </div>

      {/* Per-language fields */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Per language
        </h3>

        <LanguageTabs activeLang={activeLang} onLangChange={setActiveLang} />

        <div className="space-y-4 pt-2">
          <AdminInput
            label="Address"
            id={`contacts-address-${activeLang}`}
            value={langData.address}
            onChange={(e) => updateLangField(activeLang, "address", e.target.value)}
            placeholder="Street, City, Country"
            error={validationErrors[`${activeLang}.address`]}
            data-testid={`contacts-address-${activeLang}`}
          />

          <AdminTextarea
            label="Intro Text"
            id={`contacts-introText-${activeLang}`}
            value={langData.introText ?? ""}
            onChange={(e) => updateLangField(activeLang, "introText", e.target.value)}
            placeholder="Short intro text..."
            rows={3}
            error={validationErrors[`${activeLang}.introText`]}
            data-testid={`contacts-introText-${activeLang}`}
          />

          <AdminInput
            label="Working Hours"
            id={`contacts-workHours-${activeLang}`}
            value={langData.workHours ?? ""}
            onChange={(e) => updateLangField(activeLang, "workHours", e.target.value)}
            placeholder="Mon-Fri 10:00-18:00"
            error={validationErrors[`${activeLang}.workHours`]}
            data-testid={`contacts-workHours-${activeLang}`}
          />
        </div>
      </div>
    </div>
  );
}
