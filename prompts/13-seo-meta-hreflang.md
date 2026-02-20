# Промпт 13: SEO — Meta теги, hreflang, canonical

## Контекст
Все публичные страницы созданы (промпты 07-12). Добавляем SEO-оптимизацию.

## Задача
Настрой SEO для всех публичных страниц:

1. **Meta теги** — для каждой страницы из `seo` поля в JSON:
   - `<title>`, `<meta name="description">`
   - Open Graph теги (og:title, og:description, og:image)
   - Используй Next.js `generateMetadata`

2. **hreflang** — для каждой страницы:
   - `<link rel="alternate" hreflang="en" href="...">`
   - `<link rel="alternate" hreflang="lv" href="...">`
   - `<link rel="alternate" hreflang="ru" href="...">`

3. **Canonical** — `<link rel="canonical" href="...">` указывает на себя

4. **Sitemap** — автогенерация `sitemap.xml`:
   - Все страницы на всех языках
   - Используй Next.js sitemap API или генерацию при build

5. **robots.txt** — разрешить индексацию, указать sitemap

6. Создай утилиту `generatePageMetadata(seo, lang, path)` для единообразного формирования metadata

## Ссылки на спек
- Секция 14.1-14.6 (SEO Requirements)
- Секция 15.2 (SeoSchema)

## Требования к тестам
- Каждая страница имеет title и description
- hreflang теги присутствуют для всех 3 языков
- Canonical указывает на текущую страницу
- sitemap.xml генерируется и содержит все URL
- robots.txt существует
- Запусти тесты и `next build`

## Ожидаемый результат
Полная SEO-оптимизация: мета-теги, hreflang, canonical, sitemap, robots.txt.
