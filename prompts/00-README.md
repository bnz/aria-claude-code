# Промпты для Claude Code — Acupuncture Landing

Последовательность промптов для реализации проекта по спецификации `acupuncture-spec.md`.

## Правила использования
- Выполняй промпты **строго по порядку** (каждый следующий зависит от предыдущих)
- Каждый промпт ссылается на `acupuncture-spec.md` — держи его в контексте
- Решения фиксируй в `DECISIONS.md`
- Каждый промпт включает тесты — запускай их перед переходом к следующему

---

## Фаза 1: Фундамент (01-04)
| # | Файл | Описание |
|---|------|----------|
| 01 | `01-init-project.md` | Инициализация Next.js, структура директорий |
| 02 | `02-data-model-zod.md` | Zod-схемы и TypeScript типы |
| 03 | `03-sample-content.md` | JSON-заглушки на 3 языках |
| 04 | `04-content-loader.md` | Утилиты загрузки данных для SSG |

## Фаза 2: Публичный сайт (05-15)
| # | Файл | Описание |
|---|------|----------|
| 05 | `05-i18n-routing.md` | Мультиязычная маршрутизация |
| 06 | `06-layout-header-footer.md` | Layout, Header, Footer, dark/light тема |
| 07 | `07-home-page.md` | Главная страница |
| 08 | `08-info-page.md` | Страница «Информация» |
| 09 | `09-about-page.md` | Страница «О специалисте» |
| 10 | `10-contacts-page.md` | Страница «Контакты» |
| 11 | `11-articles-pages.md` | Список статей + страница статьи |
| 12 | `12-conditions-pages.md` | Список условий + страница условия (SEO core) |
| 13 | `13-seo-meta-hreflang.md` | Meta теги, hreflang, canonical, sitemap |
| 14 | `14-seo-structured-data.md` | JSON-LD (schema.org) |
| 15 | `15-performance-images.md` | Оптимизация: изображения, Core Web Vitals |

## Фаза 3: CMS (16-29)
| # | Файл | Описание |
|---|------|----------|
| 16 | `16-admin-auth.md` | GitHub OAuth авторизация |
| 17 | `17-admin-layout-nav.md` | Layout и навигация CMS |
| 18 | `18-admin-github-api.md` | GitHub API клиент |
| 19 | `19-admin-draft-system.md` | Draft система (localStorage) |
| 20 | `20-admin-translations-editor.md` | Редактор Translations |
| 21 | `21-admin-contacts-editor.md` | Редактор Contacts |
| 22 | `22-admin-info-editor.md` | Редактор Info (динамические секции) |
| 23 | `23-admin-about-editor.md` | Редактор About (E-E-A-T) |
| 24 | `24-admin-articles-editor.md` | Редактор Articles (CRUD) |
| 25 | `25-admin-conditions-editor.md` | Редактор Conditions (CRUD + FAQ) |
| 26 | `26-admin-media-library.md` | Media Library (загрузка/выбор изображений) |
| 27 | `27-admin-cross-lang-validation.md` | Cross-language валидация |
| 28 | `28-admin-publish.md` | Publish flow (коммиты) |
| 29 | `29-admin-deploy-status.md` | Мониторинг деплоя и блокировка |

## Фаза 4: Деплой и финализация (30-31)
| # | Файл | Описание |
|---|------|----------|
| 30 | `30-github-actions-deploy.md` | GitHub Actions CI/CD |
| 31 | `31-e2e-tests-final.md` | Финальные E2E тесты и проверка |
