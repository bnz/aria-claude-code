# 🪷 Acupuncture Landing — Техническое и бизнес-описание проекта (Master Spec)

> Документ предназначен одновременно для бизнес-аудитории и для технической реализации (включая работу с LLM/Claude).  
> Формат: Markdown. Source-of-truth для требований, архитектуры, данных и SEO.

---

## Правила работы (для Claude)

- **Source of truth:** этот файл (`acupuncture-spec.md`). Не меняй требования “по своему усмотрению”.
- **Если чего-то не хватает:** не додумывай молча — предложи дефолт и зафиксируй решение в `DECISIONS.md`.
- **Мультиязычность:** EN/LV/RU всегда вместе. Сущности синхронизируются по `id` + `slug`.
- **Валидация:** в админке всё валидируется Zod (при загрузке, при редактировании, перед publish).
- **Публикация JSON:** publish = отдельный commit на **каждый изменённый JSON файл**. Пока GitHub Actions деплой в процессе — **publish заблокирован**, но локальные правки (draft в localStorage) разрешены.
- **Загрузка изображений:** upload новой картинки = **сразу отдельный commit** (и запускает deploy). Пока идёт deploy — publish JSON заблокирован.
- **Admin бандл:** код админки не должен грузиться обычным посетителям (динамические чанки на `/admin`).
- **Темы:** авто light/dark через `prefers-color-scheme`, **без** переключателя.
- **Mobile-first:** публичная часть и CMS обязаны быть удобными на телефоне.
- **Не менять data model:** структуру `/content` и поля JSON не менять без правки этого файла.
- **Тесты после каждого шага:** после каждого промпта/итерации добавляй или обновляй **функциональные тесты** и **end-to-end (E2E) тесты**, запускай их. Если тесты не проходят — **исправляй код/реализацию (не тесты)** до полного прохождения.

---

## Содержание

- 1. Общее описание (Business Overview)
  - 1.1 Цель проекта
  - 1.2 Целевая аудитория
  - 1.3 Бизнес-ценность
- 2. Языки и локализация
- 3. Структура сайта (Public)
  - 3.1 Разделы/страницы
- 4. Mobile-First требования
- 5. Архитектура проекта
  - 5.1 Общая идея
  - 5.2 Разделение бандлов
- 6. Хранение данных (Git Repo as DB)
  - 6.1 Рекомендуемая структура
- 7. CMS (админка)
  - 7.1 Авторизация
  - 7.2 Загрузка данных
  - 7.3 Draft в localStorage
  - 7.4 Управление изображениями (Media Library)
- 8. Разделы CMS (UI)
- 9. Мультиязычность: синхронизация и предупреждения
- 10. Publish (публикация JSON)
  - 10.1 Блокировка Publish на время деплоя
- 11. Backup / откат
- 12. Технологии
  - Public сайт
  - CMS
  - Инфраструктура
- 13. Валидация данных в админке (Zod)
- 14. SEO Requirements
  - 14.1 Цель SEO
  - 14.2 Структура SEO-страниц
  - 14.3 Structured Data (schema.org)
  - 14.4 Local SEO
  - 14.5 Мультиязычность и индексация
  - 14.6 Техническое SEO
- 15. Data Model (JSON) и Zod-схемы
  - 15.1 Общие правила данных
  - 15.2 SEO модель (общая)
  - 15.3 Translations
  - 15.4 Contacts
  - 15.5 Info
  - 15.6 About (E‑E‑A‑T)
  - 15.7 Articles
  - 15.8 Conditions (SEO core)
  - 15.9 Cross-language правила (CMS)
- 16. Итоговая формулировка

---


## 1. Общее описание (Business Overview)

### 1.1 Цель проекта
Создать многоязычный информационный сайт-лендинг специалиста по акупунктуре (иглоукалыванию), который:

- объясняет метод лечения
- публикует экспертные материалы (статьи и страницы по симптомам/состояниям)
- позволяет быстро связаться со специалистом (основной CTA — звонок)
- не требует серверной инфраструктуры (без backend)
- имеет простую админку (CMS) для самостоятельного редактирования контента

Главная идея — **максимально простой сайт для посетителя + максимально простая CMS для владельца без сервера**.

### 1.2 Целевая аудитория
- Люди, ищущие помощь при симптомах/боли (локальный трафик из поиска)
- Люди, интересующиеся восточной медициной
- Локальные клиенты (контакты + звонок)

### 1.3 Бизнес-ценность
- Доверие через экспертный контент
- Органический SEO трафик (в т.ч. локальный)
- Минимальные расходы на поддержку (GitHub Pages + Actions)

---

## 2. Языки и локализация
Поддерживаемые языки:
- 🇬🇧 English
- 🇱🇻 Latviešu
- 🇷🇺 Русский

Правило: любой контент существует **во всех языках** и синхронизируется на уровне сущностей (id/slug).

---

## 3. Структура сайта (Public)

Сайт — **статический (SSG)**. Основной UX — mobile-first.

### 3.1 Разделы/страницы
- `/` — главная (приветствие, краткое описание, превью контента, CTA)
- `/articles` — список статей (превью)
- `/articles/[slug]` — страница статьи
- `/conditions` — список страниц симптомов/состояний (SEO core)
- `/conditions/[slug]` — страница симптома/состояния (SEO core)
- `/info` — «Информация» (про акупунктуру, метод, показания/противопоказания и т.п.)
- `/contacts` — контакты (телефон, адрес, карта, CTA звонка)
- `/about` — о специалисте (E‑E‑A‑T: образование, опыт, сертификаты)

> Допускается, что некоторые разделы могут быть секциями на `/`, но для SEO **страницы должны существовать отдельными URL** (особенно `conditions`, `about`, `info`).

---

## 4. Mobile-First требования
- Приоритет: мобильные устройства
- Корректная верстка/навигация на мобильных для публичного сайта и CMS
- Минимум блокирующих загрузок, оптимизация изображений

---

## 5. Архитектура проекта

### 5.1 Общая идея
- Public сайт: **Next.js SSG**, данные берутся из JSON на этапе build
- CMS: SPA/часть приложения, доступна по `/admin`, подгружается отдельными чанками
- Backend отсутствует
- Хранилище данных: GitHub репозиторий (JSON + изображения)
- Деплой: GitHub Actions → GitHub Pages + кастомный домен

### 5.2 Разделение бандлов
- Для обычных посетителей код админки **никогда не загружается**
- На `/admin` сначала грузится минимальный бандл (экран логина), после входа — основной бандл CMS

---

## 6. Хранение данных (Git Repo as DB)

Принцип: **каждая сущность — отдельный JSON**, каждый язык — отдельный файл.

### 6.1 Рекомендуемая структура
```
/content
  /translations.en.json
  /translations.lv.json
  /translations.ru.json

  /contacts.en.json
  /contacts.lv.json
  /contacts.ru.json

  /info.en.json
  /info.lv.json
  /info.ru.json

  /about.en.json
  /about.lv.json
  /about.ru.json

  /articles
    index.json
    /{slug}
      article.en.json
      article.lv.json
      article.ru.json

  /conditions
    index.json
    /{slug}
      condition.en.json
      condition.lv.json
      condition.ru.json

/public
  /media
    ... изображения, загруженные через CMS ...
```

Требования к репозиторию:
- читаемая структура (по именам видно что где)
- по git history понятно «что менялось» и «когда»
- коммиты с понятными сообщениями (см. Publish)

---

## 7. CMS (админка)

### 7.1 Авторизация
Предпочтительно: **GitHub OAuth** (без ручного ввода personal token).  
CMS получает доступ к чтению/записи контентных файлов в конкретный репозиторий.

### 7.2 Загрузка данных
1) CMS запрашивает нужные файлы из репозитория (GitHub API)  
2) загружает JSON  
3) **валидирует Zod-схемами**  
4) сохраняет локальную копию (draft) в `localStorage`  
5) пользователь редактирует данные локально

### 7.3 Draft в localStorage
- любые изменения сохраняются локально
- публикация происходит только по кнопке **Publish** (см. ниже)
- если деплой в процессе — локальное редактирование разрешено, но коммит/Publish заблокирован

### 7.4 Управление изображениями (Media Library)
В CMS должен быть встроенный **модальный экран выбора изображений**:

- при выборе картинки для статьи/секции открывается модальное окно со **всеми уже загруженными изображениями**
- можно выбрать изображение для конкретного поля (например, `heroImagePath`, секция `image` и т.п.)
- в модальном окне есть возможность **загрузить новые изображения**

#### Хранение изображений
- изображения загружаются **в Git репозиторий** в директорию проекта (например: `/public/media/`)
- изображения — **часть проекта**, деплоятся GitHub Pages вместе с билдом
- ссылки в JSON — **локальные пути** (например: `/media/hero-01.jpg`), не внешние URL

#### Upload изображений = отдельный commit
- **загрузка нового изображения** делает **сразу отдельный commit** в репозиторий (без ожидания Publish)
- такой commit запускает GitHub Actions деплой
- пока деплой идёт: **Publish (коммиты JSON) заблокирован**, но локальные правки можно продолжать

---

## 8. Разделы CMS (UI)

CMS содержит вкладки/разделы:

1) **Translations** — UI строки (header/footer/кнопки/лейблы) по трём языкам  
2) **Articles** — список, создание, редактирование, удаление (синхронно по языкам)  
3) **Conditions** — список, создание, редактирование, удаление (синхронно по языкам)  
4) **Info** — редактирование раздела «Информация» по трём языкам  
5) **Contacts** — телефон, адрес, карта, тексты по трём языкам  
6) **About** — информация о специалисте для доверия (E‑E‑A‑T)

---

## 9. Мультиязычность: синхронизация и предупреждения

Правила:
- нельзя удалить сущность только в одном языке — удаление всегда синхронно по всем языкам
- `slug` и `id` у сущности одинаковы для всех языков
- если какой-то язык не заполнен — показывать предупреждение (или блокировать Publish, см. режимы ниже)

Поведение при неполных данных:
- если пользователь изменил только RU, а EN/LV не тронул — предупреждение: «Вы изменили только один язык. Продолжить?»
- если в каком-то языке отсутствует обязательное поле — предупреждение с перечислением языков/полей

---

## 10. Publish (публикация JSON)

При нажатии **Publish**:

1) CMS делает финальную валидацию Zod (включая cross-language проверки)  
2) определяет список изменённых JSON файлов (diff относительно загруженной версии)  
3) **для каждого изменённого JSON** создаёт **отдельный commit**:
   - commit message: имя файла + дата/время
4) push в репозиторий  
5) GitHub Actions билдит и деплоит GitHub Pages

### 10.1 Блокировка Publish на время деплоя
Пока GitHub Actions выполняются:
- CMS опрашивает GitHub Actions API
- показывает loading/progress состояния деплоя
- **локальное редактирование (draft в localStorage) разрешено**
- **Publish/коммит JSON заблокирован** до завершения текущего деплоя

---

## 11. Backup / откат
- Git history — основной механизм бэкапа и отката
- опционально: теги/релизы на Publish для удобного восстановления

---

## 12. Технологии

### Public сайт
- Next.js (App Router, SSG)
- React
- TypeScript
- TailwindCSS

### CMS
- `/admin` route + динамические чанки
- Zod (валидация данных)
- GitHub OAuth
- GitHub API (чтение/запись файлов)

### Инфраструктура
- GitHub Actions (build & deploy)
- GitHub Pages (hosting)
- Custom domain

---

## 13. Валидация данных в админке (Zod)

На фронтенде CMS все данные **валидируются Zod-схемами**:
- при загрузке из GitHub (защита от битых JSON)
- при редактировании в формах (мгновенная валидация UI)
- перед Publish (финальная «гейт»-проверка)

Если данные не проходят валидацию:
- показывать понятные ошибки
- блокировать Publish до исправления

Cross-language проверка:
- per-file Zod + отдельная проверка группы языков (en/lv/ru) на согласованность

---

## 14. SEO Requirements

### 14.1 Цель SEO
Сайт оптимизируется под органический поиск Google для локальных медицинских запросов, связанных с акупунктурой.  
SEO — часть архитектуры сайта (структура страниц), а не только meta-теги.

### 14.2 Структура SEO-страниц
Обязательные индексируемые страницы:
- `/about` (E‑E‑A‑T)
- `/acupuncture` (может быть алиасом `/info` или отдельной страницей)
- `/conditions/[slug]` — **основной SEO-рост** (страница = интент)
- `/articles/[slug]` — экспертные статьи

Рекомендация: 15–25 страниц в `conditions` (симптомы/состояния).

### 14.3 Structured Data (schema.org)
Использовать JSON-LD:
- `MedicalBusiness`
- `Physician`

Содержать:
- имя
- адрес
- телефон
- часы работы
- geo координаты
- услуги

### 14.4 Local SEO
- текстовый адрес (не картинка)
- кликабельный телефон
- карта (embed)
- NAP consistency: совпадение Name/Address/Phone с Google Business Profile

### 14.5 Мультиязычность и индексация
Для каждой страницы:
- `hreflang` для `en`, `lv`, `ru`
- `canonical` на себя

Автоматически генерировать:
- `sitemap.xml`
- `robots.txt`

### 14.6 Техническое SEO
- Lighthouse SEO ≈ 100
- LCP < 2.5s
- CLS < 0.1
- оптимизированные изображения (Next Image), аккуратная загрузка шрифтов

---

## 15. Data Model (JSON) и Zod-схемы

Этот раздел фиксирует структуру данных, чтобы:
- сайт стабильно генерировался в SSG
- CMS валидировала всё через Zod
- AI не “придумывал” поля

> Принцип: один тип контента = один Zod schema + cross-language проверки.

### 15.1 Общие правила данных
1) `slug` — стабильный идентификатор, одинаковый во всех языках  
2) у каждого JSON есть `id`, `updatedAt` (ISO), (опционально) `seo`  
3) картинки — локальные пути внутри проекта (например `/media/img.jpg`)  
4) для списков — `index.json` (articles/conditions) для быстрого построения навигации

### 15.2 SEO модель (общая)
```ts
import { z } from "zod"

export const SeoSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).max(160),
  canonical: z.string().url().optional(),
  ogImagePath: z.string().min(1).optional(),
})
```

### 15.3 Translations
Файлы: `translations.{lang}.json`
```json
{
  "id": "translations",
  "updatedAt": "2026-02-19T12:00:00.000Z",
  "header": { "navHome": "Home" },
  "footer": { "copyright": "© {year}" },
  "buttons": { "callToAction": "Book a consultation" }
}
```
```ts
export const TranslationsSchema = z.object({
  id: z.string(),
  updatedAt: z.string().datetime(),
  header: z.record(z.string(), z.string()).default({}),
  footer: z.record(z.string(), z.string()).default({}),
  buttons: z.record(z.string(), z.string()).default({}),
})
```

### 15.4 Contacts
Файлы: `contacts.{lang}.json`
```json
{
  "id": "contacts",
  "updatedAt": "2026-02-19T12:00:00.000Z",
  "phone": "+371 2XXXXXXX",
  "address": "Riga, Latvia, ...",
  "mapEmbedUrl": "https://www.google.com/maps/embed?...",
  "introText": "Call to book a consultation.",
  "workHours": "Mon–Fri 10:00–18:00"
}
```
```ts
export const ContactsSchema = z.object({
  id: z.string(),
  updatedAt: z.string().datetime(),
  phone: z.string().min(3),
  address: z.string().min(3),
  mapEmbedUrl: z.string().url().optional(),
  introText: z.string().optional(),
  workHours: z.string().optional(),
})
```

### 15.5 Info
Файлы: `info.{lang}.json`
```ts
const InfoSectionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), title: z.string().optional(), content: z.string().min(1) }),
  z.object({ type: z.literal("bullets"), title: z.string().optional(), items: z.array(z.string().min(1)).min(1) }),
  z.object({ type: z.literal("image"), imagePath: z.string().min(1), caption: z.string().optional() }),
])

export const InfoSchema = z.object({
  id: z.string(),
  updatedAt: z.string().datetime(),
  seo: SeoSchema,
  title: z.string().min(1),
  sections: z.array(InfoSectionSchema).min(1),
})
```

### 15.6 About (E‑E‑A‑T)
Файлы: `about.{lang}.json`
```ts
export const AboutSchema = z.object({
  id: z.string(),
  updatedAt: z.string().datetime(),
  seo: SeoSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  credentials: z.array(z.string().min(1)).default([]),
  experienceYears: z.number().int().nonnegative().optional(),
  certificates: z.array(z.object({
    title: z.string().min(1),
    imagePath: z.string().min(1).optional(),
  })).default([]),
})
```

### 15.7 Articles

Index: `/content/articles/index.json`
```ts
export const ArticlesIndexSchema = z.object({
  updatedAt: z.string().datetime(),
  items: z.array(z.object({
    id: z.string(),
    slug: z.string().min(1),
    published: z.boolean().default(true),
    order: z.number().int().default(0),
  })).default([]),
})
```

Контент: `/content/articles/{slug}/article.{lang}.json`
```ts
const ArticleSectionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), content: z.string().min(1) }),
  z.object({ type: z.literal("image"), imagePath: z.string().min(1), caption: z.string().optional() }),
])

export const ArticleSchema = z.object({
  id: z.string(),
  slug: z.string().min(1),
  updatedAt: z.string().datetime(),
  seo: SeoSchema,
  title: z.string().min(1),
  excerpt: z.string().min(1).max(280),
  heroImagePath: z.string().min(1).optional(),
  sections: z.array(ArticleSectionSchema).min(1),
})
```

### 15.8 Conditions (SEO core)

Index: `/content/conditions/index.json`
```ts
export const ConditionsIndexSchema = z.object({
  updatedAt: z.string().datetime(),
  items: z.array(z.object({
    id: z.string(),
    slug: z.string().min(1),
    published: z.boolean().default(true),
    order: z.number().int().default(0),
  })).default([]),
})
```

Контент: `/content/conditions/{slug}/condition.{lang}.json`
```ts
export const ConditionSchema = z.object({
  id: z.string(),
  slug: z.string().min(1),
  updatedAt: z.string().datetime(),
  seo: SeoSchema,
  title: z.string().min(1),
  intro: z.string().min(1),
  sections: z.array(InfoSectionSchema).min(1),
  contraindications: z.array(z.string().min(1)).default([]),
  faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).default([]),
})
```

### 15.9 Cross-language правила (CMS)
- per-file Zod validation + group consistency validation (`id`, `slug`, обязательные поля, SEO минимум)
- режимы:
  - строгий: блокировать Publish при неполном языке
  - мягкий: разрешить Publish только после явного подтверждения

---

## 16. Итоговая формулировка
Проект — это **статический медицинский сайт** с многоязычным контентом и полноценной CMS без backend,  
где GitHub выступает как хранилище данных и механизм деплоя,  
а корректность данных гарантируется Zod-валидацией на фронтенде админки.
