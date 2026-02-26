# DECISIONS.md — Лог архитектурных и технических решений

Формат записи:

```
## YYYY-MM-DD — Краткое описание вопроса

**Вопрос:** Что именно нужно решить?
**Решение:** Что выбрали.
**Обоснование:** Почему.
```

---

## 2026-02-20 — Unit test framework

**Вопрос:** Vitest или Jest для unit-тестирования?
**Решение:** Vitest
**Обоснование:** Native ESM/TypeScript support without extra transforms, faster execution, compatible Vite-based config, same API as Jest (expect, describe, it). Works well with Next.js projects.

---

## 2026-02-20 — Zod version

**Вопрос:** Zod v3 or v4?
**Решение:** Zod v4 (latest)
**Обоснование:** v4 is the current stable release on npm. The API used in the spec (z.object, z.string, z.discriminatedUnion, etc.) is compatible with v4.

---

## 2026-02-20 — Root URL redirect strategy

**Вопрос:** Middleware или client-side redirect с `/` на язык по умолчанию? Accept-Language detection?
**Решение:** Server-side redirect via Next.js `redirect()` to `/en` (default language). No Accept-Language detection.
**Обоснование:** With `output: "export"` (SSG), Next.js middleware is not supported. A server redirect from the root page is the simplest approach. Accept-Language detection is not possible in static export. Users can switch language via LanguageSwitcher component.

---

## 2026-02-23 — Site URL for SEO (canonical, sitemap, hreflang)

**Вопрос:** What base URL to use for canonical/hreflang/sitemap links? Domain is not yet configured.
**Решение:** Configurable via `NEXT_PUBLIC_SITE_URL` env var, defaults to `https://example.com`.
**Обоснование:** The domain will be configured when deploying to GitHub Pages (prompt 30). Using an env var allows easy configuration without code changes. Default `example.com` is a safe placeholder for development.

---

## 2026-02-25 — CMS authentication method (PAT vs OAuth)

**Вопрос:** How to authenticate CMS users with GitHub? Options: OAuth Device Flow, OAuth Web Flow, Personal Access Token (PAT).
**Решение:** Personal Access Token (PAT) entered manually by the user.
**Обоснование:** The site uses `output: "export"` (fully static, no backend). OAuth Web Flow requires a `client_secret` on a server. OAuth Device Flow requires CORS-enabled POST to `https://github.com/login/device/code`, which GitHub blocks from browsers. PAT is the only viable fully client-side approach: user creates a fine-grained PAT with repo content scope, pastes it into the admin login form, token is validated against `GET /user` and stored in `sessionStorage`.
