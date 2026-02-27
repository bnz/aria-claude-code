import type { z } from "zod";
import { fetchFile } from "@/lib/admin/github";
import type { Language } from "@/schemas/languages";
import {
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

export interface ContentManager {
  /** Fetch a JSON file, parse it, and validate with a Zod schema. */
  loadFile<T>(path: string, schema: z.ZodType<T>): Promise<{ data: T; sha: string }>;

  loadTranslations(lang: Language): Promise<Translations>;
  loadContacts(lang: Language): Promise<Contacts>;
  loadInfo(lang: Language): Promise<Info>;
  loadAbout(lang: Language): Promise<About>;
  loadArticlesIndex(): Promise<ArticlesIndex>;
  loadArticle(slug: string, lang: Language): Promise<Article>;
  loadConditionsIndex(): Promise<ConditionsIndex>;
  loadCondition(slug: string, lang: Language): Promise<Condition>;

  /** Return the cached SHA for a previously loaded file path. */
  getSha(path: string): string | undefined;

  /** Clear SHA cache. If path is provided, clear only that entry; otherwise clear all. */
  invalidateCache(path?: string): void;
}

/**
 * Create a content manager bound to a GitHub token.
 * Provides typed loaders for all CMS content files with Zod validation and SHA caching.
 */
export function createContentManager(token: string): ContentManager {
  const shaCache = new Map<string, string>();

  async function loadFile<T>(
    path: string,
    schema: z.ZodType<T>,
  ): Promise<{ data: T; sha: string }> {
    const file = await fetchFile(token, path);

    let parsed: unknown;
    try {
      parsed = JSON.parse(file.content);
    } catch {
      throw new Error(`Invalid JSON in file "${path}"`);
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new Error(`Validation failed for "${path}": ${issues}`);
    }

    shaCache.set(path, file.sha);
    return { data: result.data, sha: file.sha };
  }

  async function loadTranslations(lang: Language): Promise<Translations> {
    const { data } = await loadFile(`content/translations.${lang}.json`, TranslationsSchema);
    return data;
  }

  async function loadContacts(lang: Language): Promise<Contacts> {
    const { data } = await loadFile(`content/contacts.${lang}.json`, ContactsSchema);
    return data;
  }

  async function loadInfo(lang: Language): Promise<Info> {
    const { data } = await loadFile(`content/info.${lang}.json`, InfoSchema);
    return data;
  }

  async function loadAbout(lang: Language): Promise<About> {
    const { data } = await loadFile(`content/about.${lang}.json`, AboutSchema);
    return data;
  }

  async function loadArticlesIndex(): Promise<ArticlesIndex> {
    const { data } = await loadFile("content/articles/index.json", ArticlesIndexSchema);
    return data;
  }

  async function loadArticle(slug: string, lang: Language): Promise<Article> {
    const { data } = await loadFile(
      `content/articles/${slug}/article.${lang}.json`,
      ArticleSchema,
    );
    return data;
  }

  async function loadConditionsIndex(): Promise<ConditionsIndex> {
    const { data } = await loadFile("content/conditions/index.json", ConditionsIndexSchema);
    return data;
  }

  async function loadCondition(slug: string, lang: Language): Promise<Condition> {
    const { data } = await loadFile(
      `content/conditions/${slug}/condition.${lang}.json`,
      ConditionSchema,
    );
    return data;
  }

  function getSha(path: string): string | undefined {
    return shaCache.get(path);
  }

  function invalidateCache(path?: string): void {
    if (path) {
      shaCache.delete(path);
    } else {
      shaCache.clear();
    }
  }

  return {
    loadFile,
    loadTranslations,
    loadContacts,
    loadInfo,
    loadAbout,
    loadArticlesIndex,
    loadArticle,
    loadConditionsIndex,
    loadCondition,
    getSha,
    invalidateCache,
  };
}
