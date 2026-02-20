# Промпт 30: GitHub Actions — Build и Deploy

## Контекст
CMS полностью готова (промпты 16-29). Настраиваем CI/CD.

## Задача
Создай GitHub Actions workflow для автоматического build и deploy:

1. **Workflow файл** `.github/workflows/deploy.yml`:
   - Trigger: push в main branch
   - Steps:
     a) Checkout
     b) Setup Node.js
     c) Install dependencies
     d) Run tests
     e) `next build` (SSG)
     f) Deploy to GitHub Pages

2. **GitHub Pages настройка**:
   - Output: static export (`next.config` → `output: 'export'`)
   - Базовый путь (если не root domain)
   - CNAME файл для custom domain (если есть)
   - `.nojekyll` файл

3. **Permissions**: workflow должен иметь права на deploy Pages

4. **Оптимизация**:
   - Кеширование node_modules
   - Кеширование Next.js build cache

## Ссылки на спек
- Секция 5.1 (Деплой: GitHub Actions → GitHub Pages)
- Секция 12 (Инфраструктура)

## Требования к тестам
- Workflow файл валиден (yaml lint)
- `next build` проходит без ошибок (локально)
- Static export генерирует HTML для всех страниц/языков
- Запусти тесты

## Ожидаемый результат
Рабочий CI/CD pipeline: push → test → build → deploy на GitHub Pages.
