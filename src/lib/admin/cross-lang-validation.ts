import type { Language } from "@/schemas/languages";
import { LANGUAGES } from "@/schemas/languages";

/** Severity of a cross-language issue */
export type IssueSeverity = "error" | "warning";

/** A single cross-language validation issue */
export interface CrossLangIssue {
  severity: IssueSeverity;
  field: string;
  message: string;
  languages?: Language[];
}

/** Result of cross-language validation */
export interface CrossLangResult {
  valid: boolean;
  issues: CrossLangIssue[];
}

/** Validation mode for publish gating */
export type ValidationMode = "strict" | "soft";

/**
 * Check if a value is a non-empty string.
 */
function isNonEmpty(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Get a nested field value from an object by dot-separated path.
 */
function getField(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Validate that id and slug fields match across all languages.
 */
function validateIdSlugConsistency(
  data: Record<Language, Record<string, unknown>>,
): CrossLangIssue[] {
  const issues: CrossLangIssue[] = [];

  // Check id consistency
  const ids = LANGUAGES.map((lang) => ({ lang, id: data[lang].id }));
  const uniqueIds = new Set(ids.map((x) => x.id));
  if (uniqueIds.size > 1) {
    issues.push({
      severity: "error",
      field: "id",
      message: `ID mismatch: ${ids.map((x) => `${x.lang}="${x.id}"`).join(", ")}`,
      languages: LANGUAGES.filter((lang, i) => ids[i].id !== ids[0].id),
    });
  }

  // Check slug consistency (if present)
  if ("slug" in data.en) {
    const slugs = LANGUAGES.map((lang) => ({ lang, slug: data[lang].slug }));
    const uniqueSlugs = new Set(slugs.map((x) => x.slug));
    if (uniqueSlugs.size > 1) {
      issues.push({
        severity: "error",
        field: "slug",
        message: `Slug mismatch: ${slugs.map((x) => `${x.lang}="${x.slug}"`).join(", ")}`,
        languages: LANGUAGES.filter((lang, i) => slugs[i].slug !== slugs[0].slug),
      });
    }
  }

  return issues;
}

/**
 * Validate that required fields are filled in all languages.
 */
function validateRequiredFields(
  data: Record<Language, Record<string, unknown>>,
  requiredFields: string[],
): CrossLangIssue[] {
  const issues: CrossLangIssue[] = [];

  for (const field of requiredFields) {
    const emptyLangs = LANGUAGES.filter((lang) => {
      const value = getField(data[lang], field);
      return !isNonEmpty(value);
    });

    if (emptyLangs.length > 0 && emptyLangs.length < LANGUAGES.length) {
      issues.push({
        severity: "warning",
        field,
        message: `"${field}" is empty in ${emptyLangs.join(", ").toUpperCase()}`,
        languages: emptyLangs,
      });
    }
  }

  return issues;
}

/**
 * Validate that SEO title and description are filled in all languages.
 */
function validateSeoFields(
  data: Record<Language, Record<string, unknown>>,
): CrossLangIssue[] {
  // Check if the entity has SEO
  if (!data.en.seo || typeof data.en.seo !== "object") return [];

  return validateRequiredFields(data, ["seo.title", "seo.description"]);
}

/**
 * Validate that section count matches across languages (for articles/conditions).
 */
function validateSectionCount(
  data: Record<Language, Record<string, unknown>>,
): CrossLangIssue[] {
  const issues: CrossLangIssue[] = [];

  // Check if the entity has sections
  if (!Array.isArray(data.en.sections)) return issues;

  const counts = LANGUAGES.map((lang) => ({
    lang,
    count: Array.isArray(data[lang].sections) ? (data[lang].sections as unknown[]).length : 0,
  }));

  const uniqueCounts = new Set(counts.map((x) => x.count));
  if (uniqueCounts.size > 1) {
    issues.push({
      severity: "error",
      field: "sections",
      message: `Section count mismatch: ${counts.map((x) => `${x.lang.toUpperCase()}=${x.count}`).join(", ")}`,
      languages: LANGUAGES.filter((lang, i) => counts[i].count !== counts[0].count),
    });
  }

  return issues;
}

/**
 * Detect if only some languages have been modified (comparing to originals).
 * Returns a warning if changes are not uniform.
 */
export function detectPartialEdit(
  current: Record<Language, Record<string, unknown>>,
  original: Record<Language, Record<string, unknown>>,
): CrossLangIssue | null {
  const changedLangs: Language[] = [];
  const unchangedLangs: Language[] = [];

  for (const lang of LANGUAGES) {
    const currentStr = JSON.stringify(current[lang]);
    const originalStr = JSON.stringify(original[lang]);
    if (currentStr !== originalStr) {
      changedLangs.push(lang);
    } else {
      unchangedLangs.push(lang);
    }
  }

  if (changedLangs.length > 0 && unchangedLangs.length > 0) {
    return {
      severity: "warning",
      field: "_partial_edit",
      message: `Only ${changedLangs.map((l) => l.toUpperCase()).join(", ")} modified. ${unchangedLangs.map((l) => l.toUpperCase()).join(", ")} not updated.`,
      languages: unchangedLangs,
    };
  }

  return null;
}

/** Entity-type-specific required field lists */
const ENTITY_REQUIRED_FIELDS: Record<string, string[]> = {
  translations: [],
  contacts: ["phone", "address"],
  info: ["title"],
  about: ["title", "summary"],
  article: ["title", "excerpt"],
  condition: ["title", "intro"],
};

/**
 * Run full cross-language validation on a set of language data.
 * @param entityType - The type of entity being validated
 * @param data - Object with en/lv/ru language data
 * @returns Validation result with issues
 */
export function validateCrossLang(
  entityType: string,
  data: Record<Language, Record<string, unknown>>,
): CrossLangResult {
  const issues: CrossLangIssue[] = [];

  // 1. id/slug consistency
  issues.push(...validateIdSlugConsistency(data));

  // 2. Required fields check
  const requiredFields = ENTITY_REQUIRED_FIELDS[entityType] ?? [];
  issues.push(...validateRequiredFields(data, requiredFields));

  // 3. SEO fields check
  issues.push(...validateSeoFields(data));

  // 4. Section count check (for sectioned entities)
  if (entityType === "article" || entityType === "condition" || entityType === "info") {
    issues.push(...validateSectionCount(data));
  }

  const hasErrors = issues.some((i) => i.severity === "error");
  return { valid: !hasErrors, issues };
}

/**
 * Check if publish should be allowed given validation results and mode.
 * @returns true if publish is allowed
 */
export function canPublish(
  result: CrossLangResult,
  mode: ValidationMode,
  userConfirmed: boolean,
): boolean {
  if (result.issues.length === 0) return true;

  const hasErrors = result.issues.some((i) => i.severity === "error");
  if (hasErrors) return false; // Errors always block publish

  // Only warnings remain
  if (mode === "strict") return false;
  // Soft mode: allow after confirmation
  return userConfirmed;
}
