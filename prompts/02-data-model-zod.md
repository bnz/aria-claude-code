# Промпт 02: Data Model и Zod-схемы

## Контекст
Проект инициализирован (промпт 01). Теперь нужно создать типы данных и Zod-схемы — фундамент для CMS и публичного сайта.

## Задача
Создай все Zod-схемы и TypeScript типы согласно секции 15 спека:

1. Создай файл `src/schemas/seo.ts` — `SeoSchema` (секция 15.2)
2. Создай `src/schemas/translations.ts` — `TranslationsSchema` (секция 15.3)
3. Создай `src/schemas/contacts.ts` — `ContactsSchema` (секция 15.4)
4. Создай `src/schemas/info.ts` — `InfoSchema` + `InfoSectionSchema` (секция 15.5)
5. Создай `src/schemas/about.ts` — `AboutSchema` (секция 15.6)
6. Создай `src/schemas/articles.ts` — `ArticlesIndexSchema` + `ArticleSchema` + `ArticleSectionSchema` (секция 15.7)
7. Создай `src/schemas/conditions.ts` — `ConditionsIndexSchema` + `ConditionSchema` (секция 15.8)
8. Создай `src/schemas/index.ts` — реэкспорт всех схем
9. Для каждой схемы экспортируй TypeScript тип через `z.infer<>`
10. Создай общие типы: `Language = 'en' | 'lv' | 'ru'`, `LANGUAGES = ['en', 'lv', 'ru'] as const`

## Ссылки на спек
- Секция 15 целиком (Data Model)
- Секция 15.1 (Общие правила данных)

## Требования к тестам
- Напиши unit-тесты для каждой Zod-схемы: валидные данные проходят, невалидные — нет
- Проверь edge cases: пустые строки, отсутствующие обязательные поля, невалидные URL
- Запусти тесты и убедись, что они проходят

## Ожидаемый результат
Полный набор Zod-схем, покрытых тестами, готовых к использованию в SSG и CMS.
