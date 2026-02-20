# Промпт 18: CMS — GitHub API клиент и загрузка данных

## Контекст
CMS layout готов (промпт 17). Нужен слой работы с GitHub API.

## Задача
Создай клиент GitHub API для CMS:

1. **GitHub API утилиты** (`src/lib/admin/github.ts`):
   - `fetchFile(path)` — получить содержимое файла из репо (Base64 → JSON)
   - `commitFile(path, content, message)` — создать коммит с одним файлом
   - `commitFiles(files[], message)` — создать коммит с несколькими файлами
   - `uploadImage(path, base64content)` — загрузить изображение (отдельный коммит)
   - `getDeployStatus()` — получить статус GitHub Actions (latest workflow run)
   - `listFiles(directory)` — список файлов в директории

2. **Content Manager** (`src/lib/admin/contentManager.ts`):
   - Загрузка всех JSON из `/content` через GitHub API
   - Валидация каждого файла через Zod
   - Обработка ошибок: битый JSON, невалидная структура, отсутствующий файл
   - Кеширование SHA файлов (нужно для GitHub API PUT)

3. Все запросы через `Octokit` или fetch с правильными headers (Authorization: token)

## Ссылки на спек
- Секция 7.2 (Загрузка данных)
- Секция 10 (Publish — отдельный commit на каждый файл)
- Секция 7.4 (Upload изображений = отдельный commit)

## Требования к тестам
- Mock GitHub API: тест загрузки файла, тест коммита
- Тест валидации загруженного JSON через Zod
- Тест обработки ошибок (404, невалидный JSON)
- Запусти тесты

## Ожидаемый результат
Надёжный клиент GitHub API с валидацией, готовый для использования в редакторах CMS.
