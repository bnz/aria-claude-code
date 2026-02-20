# Промпт 29: CMS — Статус деплоя и блокировка Publish

## Контекст
Publish реализован (промпт 28). Добавляем мониторинг деплоя и блокировку.

## Задача
Реализуй отслеживание статуса GitHub Actions и блокировку:

1. **Deploy Status Monitor** (`src/lib/admin/deployStatus.ts`):
   - Polling GitHub Actions API: GET workflow runs для репозитория
   - Определение статуса: `idle` | `in_progress` | `completed` | `failed`
   - Polling interval: каждые 10-15 секунд (когда deploy in_progress)

2. **UI индикатор** (в header CMS):
   - Зелёный: deploy завершён / idle
   - Жёлтый/анимация: deploy в процессе
   - Красный: deploy failed
   - Клик → показать детали (ссылка на GitHub Actions run)

3. **Блокировка**:
   - Пока deploy `in_progress`:
     - Кнопка Publish заблокирована (disabled + tooltip «Deploy в процессе»)
     - Upload изображений заблокирован (тоже создаёт коммит → конфликт)
   - Локальное редактирование и сохранение в draft — разрешено всегда
   - После завершения deploy — разблокировка автоматически

4. **Edge case**: если пользователь загрузил изображение (промпт 26) → deploy запустился → publish заблокирован до завершения

## Ссылки на спек
- Секция 10.1 (Блокировка Publish на время деплоя)
- Секция 7.4 (Upload → deploy → блокировка Publish)

## Требования к тестам
- Mock: deploy in_progress → Publish заблокирован
- Mock: deploy completed → Publish разблокирован
- Mock: deploy failed → показать ошибку
- Upload заблокирован во время deploy
- Draft разрешён всегда
- Запусти тесты

## Ожидаемый результат
Мониторинг деплоя с автоматической блокировкой/разблокировкой Publish.
