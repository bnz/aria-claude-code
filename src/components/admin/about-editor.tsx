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
import { AboutSchema } from "@/schemas";
import type { About } from "@/schemas";
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

const DRAFT_KEYS: Record<Language, string> = {
  en: "content/about.en.json",
  lv: "content/about.lv.json",
  ru: "content/about.ru.json",
};

type LoadingState = "idle" | "loading" | "loaded" | "error";

interface AboutData {
  en: About;
  lv: About;
  ru: About;
}

function getDefaultAbout(): About {
  return {
    id: "about",
    updatedAt: new Date().toISOString(),
    seo: { title: "", description: "" },
    title: "",
    summary: "",
    credentials: [],
    certificates: [],
  };
}

export function AboutEditor() {
  const { token } = useAdminAuth();
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AboutData | null>(null);
  const [activeLang, setActiveLang] = useState<Language>("en");
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [pendingServerData, setPendingServerData] = useState<AboutData | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const isDirty = useMemo(() => {
    const dirty = getDirtyKeys();
    return LANGUAGES.some((lang) => dirty.includes(DRAFT_KEYS[lang]));
  }, [data]);

  const cm = useMemo(() => {
    if (!token) return null;
    return createContentManager(token);
  }, [token]);

  useEffect(() => {
    if (!data) return;
    for (const lang of LANGUAGES) {
      saveDraft(DRAFT_KEYS[lang], data[lang]);
    }
  }, [data]);

  const validateData = useCallback((d: AboutData): boolean => {
    const errors: Record<string, string> = {};
    let valid = true;
    for (const lang of LANGUAGES) {
      const result = AboutSchema.safeParse(d[lang]);
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
        cm.loadAbout("en"),
        cm.loadAbout("lv"),
        cm.loadAbout("ru"),
      ]);
      const serverData: AboutData = { en, lv, ru };
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
      setError(err instanceof Error ? err.message : "Failed to load about");
      setLoadingState("error");
    }
  }, [cm]);

  useEffect(() => {
    if (loadingState === "idle" && cm) {
      loadFromGitHub();
    }
  }, [loadFromGitHub, loadingState, cm]);

  const handleRestoreDraft = useCallback(() => {
    const restored: AboutData = {
      en: loadDraft<About>(DRAFT_KEYS.en) ?? pendingServerData?.en ?? getDefaultAbout(),
      lv: loadDraft<About>(DRAFT_KEYS.lv) ?? pendingServerData?.lv ?? getDefaultAbout(),
      ru: loadDraft<About>(DRAFT_KEYS.ru) ?? pendingServerData?.ru ?? getDefaultAbout(),
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

  // Update per-language simple field
  const updateField = useCallback(
    (lang: Language, field: "title" | "summary", value: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const updated: AboutData = {
          ...prev,
          [lang]: { ...prev[lang], updatedAt: new Date().toISOString(), [field]: value },
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
        const updated: AboutData = {
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

  // Update experienceYears (shared across all languages)
  const updateExperienceYears = useCallback(
    (value: string) => {
      const num = value === "" ? undefined : parseInt(value, 10);
      setData((prev) => {
        if (!prev) return prev;
        const now = new Date().toISOString();
        const updated: AboutData = {
          en: { ...prev.en, updatedAt: now, experienceYears: num },
          lv: { ...prev.lv, updatedAt: now, experienceYears: num },
          ru: { ...prev.ru, updatedAt: now, experienceYears: num },
        };
        validateData(updated);
        return updated;
      });
    },
    [validateData],
  );

  // --- Credentials (per-language list of strings) ---

  const updateCredential = useCallback(
    (lang: Language, index: number, value: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const credentials = [...prev[lang].credentials];
        credentials[index] = value;
        const updated: AboutData = {
          ...prev,
          [lang]: { ...prev[lang], updatedAt: new Date().toISOString(), credentials },
        };
        validateData(updated);
        return updated;
      });
    },
    [validateData],
  );

  const addCredential = useCallback(() => {
    setData((prev) => {
      if (!prev) return prev;
      const now = new Date().toISOString();
      const updated = { ...prev };
      for (const lang of LANGUAGES) {
        updated[lang] = {
          ...prev[lang],
          updatedAt: now,
          credentials: [...prev[lang].credentials, ""],
        };
      }
      validateData(updated);
      return updated;
    });
  }, [validateData]);

  const deleteCredential = useCallback(
    (index: number) => {
      setData((prev) => {
        if (!prev) return prev;
        const now = new Date().toISOString();
        const updated = { ...prev };
        for (const lang of LANGUAGES) {
          updated[lang] = {
            ...prev[lang],
            updatedAt: now,
            credentials: prev[lang].credentials.filter((_, i) => i !== index),
          };
        }
        validateData(updated);
        return updated;
      });
    },
    [validateData],
  );

  // --- Certificates (title per-language, imagePath shared) ---

  const updateCertificateTitle = useCallback(
    (lang: Language, index: number, value: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const certificates = [...prev[lang].certificates];
        certificates[index] = { ...certificates[index], title: value };
        const updated: AboutData = {
          ...prev,
          [lang]: { ...prev[lang], updatedAt: new Date().toISOString(), certificates },
        };
        validateData(updated);
        return updated;
      });
    },
    [validateData],
  );

  const updateCertificateImage = useCallback(
    (index: number, value: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const now = new Date().toISOString();
        const updated = { ...prev };
        for (const lang of LANGUAGES) {
          const certificates = [...prev[lang].certificates];
          certificates[index] = {
            ...certificates[index],
            imagePath: value || undefined,
          };
          updated[lang] = { ...prev[lang], updatedAt: now, certificates };
        }
        validateData(updated);
        return updated;
      });
    },
    [validateData],
  );

  const addCertificate = useCallback(() => {
    setData((prev) => {
      if (!prev) return prev;
      const now = new Date().toISOString();
      const updated = { ...prev };
      for (const lang of LANGUAGES) {
        updated[lang] = {
          ...prev[lang],
          updatedAt: now,
          certificates: [...prev[lang].certificates, { title: "" }],
        };
      }
      validateData(updated);
      return updated;
    });
  }, [validateData]);

  const deleteCertificate = useCallback(
    (index: number) => {
      setData((prev) => {
        if (!prev) return prev;
        const now = new Date().toISOString();
        const updated = { ...prev };
        for (const lang of LANGUAGES) {
          updated[lang] = {
            ...prev[lang],
            updatedAt: now,
            certificates: prev[lang].certificates.filter((_, i) => i !== index),
          };
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
      <AdminCard title="About">
        <p className="text-muted-foreground" data-testid="about-loading">Loading about...</p>
      </AdminCard>
    );
  }

  if (loadingState === "error") {
    return (
      <AdminCard title="About">
        <p className="text-red-600 dark:text-red-400" data-testid="about-error">{error}</p>
        <AdminButton variant="secondary" size="sm" onClick={loadFromGitHub} className="mt-2">
          Retry
        </AdminButton>
      </AdminCard>
    );
  }

  if (showDraftRecovery) {
    return (
      <AdminCard title="About">
        <DraftRecoveryDialog onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />
      </AdminCard>
    );
  }

  if (!data) return null;

  const langData = data[activeLang];

  return (
    <div className="space-y-6" data-testid="about-editor">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">About / Specialist</h2>
        <DraftIndicator visible={isDirty} />
      </div>

      {/* Shared field: experienceYears */}
      <div className="space-y-3 rounded-lg border border-border p-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Shared (all languages)
        </h3>
        <AdminInput
          label="Years of Experience"
          id="about-experienceYears"
          type="number"
          value={data.en.experienceYears?.toString() ?? ""}
          onChange={(e) => updateExperienceYears(e.target.value)}
          placeholder="e.g. 15"
          error={validationErrors["en.experienceYears"]}
          data-testid="about-experienceYears"
        />
      </div>

      {/* Language tabs */}
      <LanguageTabs activeLang={activeLang} onLangChange={setActiveLang} />

      {/* Title & Summary */}
      <AdminInput
        label="Title"
        id={`about-title-${activeLang}`}
        value={langData.title}
        onChange={(e) => updateField(activeLang, "title", e.target.value)}
        error={validationErrors[`${activeLang}.title`]}
        data-testid={`about-title-${activeLang}`}
      />

      <AdminTextarea
        label="Summary"
        id={`about-summary-${activeLang}`}
        value={langData.summary}
        onChange={(e) => updateField(activeLang, "summary", e.target.value)}
        rows={4}
        error={validationErrors[`${activeLang}.summary`]}
        data-testid={`about-summary-${activeLang}`}
      />

      {/* SEO */}
      <div className="space-y-3 rounded-lg border border-border p-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">SEO</h3>
        <AdminInput
          label="SEO Title"
          id={`about-seo-title-${activeLang}`}
          value={langData.seo.title}
          onChange={(e) => updateSeoField(activeLang, "title", e.target.value)}
          error={validationErrors[`${activeLang}.seo.title`]}
          data-testid={`about-seo-title-${activeLang}`}
        />
        <AdminInput
          label="SEO Description"
          id={`about-seo-description-${activeLang}`}
          value={langData.seo.description}
          onChange={(e) => updateSeoField(activeLang, "description", e.target.value)}
          error={validationErrors[`${activeLang}.seo.description`]}
          data-testid={`about-seo-description-${activeLang}`}
        />
        <AdminInput
          label="OG Image Path (optional)"
          id={`about-seo-ogImagePath-${activeLang}`}
          value={langData.seo.ogImagePath ?? ""}
          onChange={(e) => updateSeoField(activeLang, "ogImagePath", e.target.value)}
          placeholder="/media/og-image.jpg"
          data-testid={`about-seo-ogImagePath-${activeLang}`}
        />
      </div>

      {/* Credentials */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Credentials ({langData.credentials.length})
        </h3>

        {langData.credentials.map((cred, idx) => (
          <div key={idx} className="flex gap-2" data-testid={`credential-${idx}`}>
            <div className="flex-1">
              <AdminInput
                label={`Credential ${idx + 1}`}
                id={`about-credential-${idx}-${activeLang}`}
                value={cred}
                onChange={(e) => updateCredential(activeLang, idx, e.target.value)}
                error={validationErrors[`${activeLang}.credentials.${idx}`]}
                data-testid={`about-credential-${idx}-${activeLang}`}
              />
            </div>
            <div className="pt-6">
              <AdminButton
                variant="danger"
                size="sm"
                onClick={() => deleteCredential(idx)}
                data-testid={`credential-${idx}-delete`}
              >
                &times;
              </AdminButton>
            </div>
          </div>
        ))}

        <AdminButton
          variant="secondary"
          size="sm"
          onClick={addCredential}
          data-testid="add-credential"
        >
          + Add credential
        </AdminButton>
      </div>

      {/* Certificates */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Certificates ({langData.certificates.length})
        </h3>

        {langData.certificates.map((cert, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-border p-3 space-y-2"
            data-testid={`certificate-${idx}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Certificate #{idx + 1}
              </span>
              <AdminButton
                variant="danger"
                size="sm"
                onClick={() => deleteCertificate(idx)}
                data-testid={`certificate-${idx}-delete`}
              >
                Delete
              </AdminButton>
            </div>

            <AdminInput
              label="Title"
              id={`about-cert-title-${idx}-${activeLang}`}
              value={cert.title}
              onChange={(e) => updateCertificateTitle(activeLang, idx, e.target.value)}
              error={validationErrors[`${activeLang}.certificates.${idx}.title`]}
              data-testid={`about-cert-title-${idx}-${activeLang}`}
            />

            <ImagePicker
              label="Certificate Image (optional)"
              value={cert.imagePath ?? ""}
              onChange={(path) => updateCertificateImage(idx, path)}
              data-testid={`about-cert-imagePath-${idx}`}
            />
          </div>
        ))}

        <AdminButton
          variant="secondary"
          size="sm"
          onClick={addCertificate}
          data-testid="add-certificate"
        >
          + Add certificate
        </AdminButton>
      </div>
    </div>
  );
}
