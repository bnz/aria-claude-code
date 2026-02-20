# CLAUDE.md — Инструкции для Claude Code

## Спецификация проекта

**Source of truth:** `acupuncture-spec.md` — читай перед каждой задачей. Не меняй требования по своему усмотрению.

---

## Архитектура (кратко)

- **Тип:** статический многоязычный медицинский сайт + CMS без backend
- **Стек:** Next.js (App Router, SSG), React, TypeScript, TailwindCSS, Zod
- **Языки контента:** EN / LV / RU — всегда вместе, синхронизация по `id`/`slug`
- **Хранение данных:** JSON файлы в `/content`, изображения в `/public/media/`
- **CMS:** SPA на `/admin`, GitHub OAuth, работа через GitHub API
- **Деплой:** GitHub Actions → GitHub Pages
- **Тема:** авто light/dark через `prefers-color-scheme`, без переключателя
- **Приоритет вёрстки:** mobile-first (и публичная часть, и CMS)

### Структура проекта
```text
/content                  — JSON-данные (по языкам)
/public/media             — изображения (загружаются через CMS)
/src
  /schemas                — Zod-схемы и TypeScript типы
  /lib                    — утилиты (content loader, languages)
  /lib/admin              — утилиты CMS (github API, draft, validation)
  /components             — React компоненты публичного сайта
  /components/admin       — React компоненты CMS
/app
  /[lang]                 — публичные страницы (i18n routing)
  /admin                  — CMS (динамический import, отдельный бандл)
```

---

## Команды

```bash
npm run dev          # dev server
npm run build        # SSG build (static export)
npm run test         # запуск unit/functional тестов
npm run test:e2e     # запуск E2E тестов
npm run lint         # ESLint + Prettier check
```

---

## Соглашения по коду

- **TypeScript:** строгий режим, никаких `any`
- **Компоненты:** функциональные (FC + hooks), не классы
- **Именование файлов:** `kebab-case` для файлов, `PascalCase` для компонентов
- **Именование переменных:** `camelCase`
- **Импорты:** абсолютные через `@/` (например `@/schemas`, `@/lib/content`)
- **Стили:** TailwindCSS utility classes, минимум кастомного CSS
- **Схемы:** все данные валидируются Zod, типы выводятся через `z.infer<>`
- **Экспорт:** named exports (не default), кроме page/layout компонентов Next.js
- **Комментарии:** на английском, JSDoc для публичных функций

---

## Workflow / процесс работы

### Промпты
Промпты находятся в `/prompts/`. Выполняй **строго по порядку** (01 → 02 → ... → 31). Оглавление: `/prompts/00-README.md`.

### Два разных вида коммитов (НЕ ПУТАТЬ)

1) **Dev commits (код проекта)** — коммиты в текущем репозитории (Next.js + CMS + тесты).
   - Делать **вручную** после каждого промпта.
   - Цель: не потерять прогресс, иметь точки отката, пережить лимиты/разрывы сессий.

2) **Content commits (публикация контента через CMS)** — коммиты, которые делает CMS в репозиторий, где лежат `/content` и `/public/media`.
   - Upload изображения = отдельный content commit сразу (и запускает deploy).
   - Publish JSON = отдельные content commits (по одному JSON на коммит).
   - Цель: триггерить GitHub Actions деплой GitHub Pages.

Если репозиторий один (код+контент) — всё равно различай эти две “роли” по смыслу:
- Dev commits = разработка кода
- Content commits = публикация данных/медиа через CMS логикой проекта

### Тесты и фиксация прогресса на каждом шаге (обязательно)
После выполнения каждого промпта:

1. Напиши или обнови unit/functional тесты для новой функциональности
2. Напиши или обнови E2E тесты для новой функциональности (если инфраструктура E2E уже подключена; если нет — подключи как можно раньше по плану промптов)
3. Запусти `npm run test` — все тесты должны пройти
4. Запусти `npm run test:e2e` — все E2E должны пройти (если подключены)
5. Запусти `npm run build` — билд должен быть без ошибок
6. Если тесты/билд не проходят — **исправляй код, не тесты**, до полного прохождения
7. Сделай **dev commit** в текущий репозиторий (один промпт = один коммит)

Пример:
```bash
git status
git add -A
git commit -m "feat: add articles list page"
```

### Resume block (обязательно)
В конце каждого ответа/итерации всегда выводи блок **RESUME** в одинаковом формате:

- ✅ Done (что сделано)
- 🧩 Files changed (список файлов)
- 🧪 Commands run + results (test/build/e2e + результат)
- 🚦 Status (GREEN/RED)
- ➡️ Next steps (следующие 1–5 шагов)
- 🧱 Blockers (если есть) — полный текст ошибки и где она возникла

Пример формата:
```text
RESUME
✅ Done:
- ...

🧩 Files changed:
- ...

🧪 Commands:
- npm run test (PASS)
- npm run test:e2e (PASS)
- npm run build (PASS)

🚦 Status: GREEN

➡️ Next steps:
1) ...

🧱 Blockers:
- none
```

### Фиксация решений
Если спек не покрывает вопрос или есть выбор между подходами:
1. Не додумывай молча
2. Предложи дефолтный вариант
3. Зафиксируй решение в `DECISIONS.md` (формат: дата, вопрос, решение, обоснование)

---

## Запреты и границы

- **Не менять data model** — структуру `/content` и поля JSON не менять без правки `acupuncture-spec.md`
- **Не додумывать** — если чего-то не хватает в спеке, предложи и зафиксируй в `DECISIONS.md`
- **Мультиязычность = 3 языка всегда вместе** — EN/LV/RU синхронизируются по `id` + slug
- **Исправлять код, не тесты** — если тест не проходит, проблема в реализации
- **Admin бандл изолирован** — код CMS не должен попадать в бандлы публичного сайта
- **Content commits при publish JSON — по одному на файл** — не объединять несколько JSON в один коммит
- **Upload изображения = отдельный content commit** — сразу, не дожидаясь Publish

---

## Ссылки

| Файл | Описание |
|------|----------|
| `acupuncture-spec.md` | Полная спецификация проекта (source of truth) |
| `DECISIONS.md` | Лог архитектурных и технических решений |
| `prompts/00-README.md` | Оглавление промптов (31 шт., 4 фазы) |
| `prompts/01-init-project.md` — `prompts/31-e2e-tests-final.md` | Промпты для последовательной реализации |
