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
