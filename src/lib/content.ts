import fs from "fs";
import path from "path";
import type { ZodType } from "zod";
import type { Language } from "@/schemas";
import {
  LANGUAGES,
  TranslationsSchema,
  ContactsSchema,
  InfoSchema,
  AboutSchema,
  ArticlesIndexSchema,
  ArticleSchema,
  ConditionsIndexSchema,
  ConditionSchema,
} from "@/schemas";
import type {
  Translations,
  Contacts,
  Info,
  About,
  ArticlesIndex,
  Article,
  ConditionsIndex,
  Condition,
} from "@/schemas";

const CONTENT_DIR = path.join(process.cwd(), "content");

/**
 * Load and parse a JSON file, then validate with a Zod schema.
 * Throws a descriptive error if the file is missing, malformed, or invalid.
 */
function loadAndValidate<T>(filePath: string, schema: ZodType<T>): T {
  const relativePath = path.relative(process.cwd(), filePath);

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    throw new Error(`Content file not found: ${relativePath}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in content file: ${relativePath}`);
  }

  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Validation failed for ${relativePath}:\n${issues}`);
  }

  return result.data;
}

/** Load translations for a given language */
export function getTranslations(lang: Language): Translations {
  return loadAndValidate(
    path.join(CONTENT_DIR, `translations.${lang}.json`),
    TranslationsSchema,
  );
}

/** Load contacts for a given language */
export function getContacts(lang: Language): Contacts {
  return loadAndValidate(
    path.join(CONTENT_DIR, `contacts.${lang}.json`),
    ContactsSchema,
  );
}

/** Load info page for a given language */
export function getInfo(lang: Language): Info {
  return loadAndValidate(path.join(CONTENT_DIR, `info.${lang}.json`), InfoSchema);
}

/** Load about page for a given language */
export function getAbout(lang: Language): About {
  return loadAndValidate(path.join(CONTENT_DIR, `about.${lang}.json`), AboutSchema);
}

/** Load articles index */
export function getArticlesList(): ArticlesIndex {
  return loadAndValidate(
    path.join(CONTENT_DIR, "articles", "index.json"),
    ArticlesIndexSchema,
  );
}

/** Load a single article by slug and language */
export function getArticle(slug: string, lang: Language): Article {
  return loadAndValidate(
    path.join(CONTENT_DIR, "articles", slug, `article.${lang}.json`),
    ArticleSchema,
  );
}

/** Load conditions index */
export function getConditionsList(): ConditionsIndex {
  return loadAndValidate(
    path.join(CONTENT_DIR, "conditions", "index.json"),
    ConditionsIndexSchema,
  );
}

/** Load a single condition by slug and language */
export function getCondition(slug: string, lang: Language): Condition {
  return loadAndValidate(
    path.join(CONTENT_DIR, "conditions", slug, `condition.${lang}.json`),
    ConditionSchema,
  );
}

/**
 * Load all 3 language versions using a loader function.
 * Returns a record keyed by language code.
 */
export function getAllLanguageVersions<T>(
  loader: (lang: Language) => T,
): Record<Language, T> {
  return Object.fromEntries(LANGUAGES.map((lang) => [lang, loader(lang)])) as Record<
    Language,
    T
  >;
}
