# Промпт 14: SEO — Structured Data (JSON-LD)

## Контекст
Базовый SEO настроен (промпт 13). Добавляем structured data.

## Задача
Добавь JSON-LD structured data согласно секции 14.3 спека:

1. **MedicalBusiness** (на всех страницах или в layout):
   - name, address, telephone, openingHours
   - geo (latitude, longitude)
   - url, image

2. **Physician** (на странице /about):
   - name, description, medicalSpecialty
   - credentials

3. **FAQPage** (на страницах /conditions/[slug]):
   - Из массива `faq` в condition JSON

4. **Article** (на страницах /articles/[slug]):
   - headline, dateModified, author

5. Создай компонент `JsonLd` для вставки JSON-LD в head
6. Данные берутся из соответствующих JSON (contacts для адреса/телефона, about для специалиста)

## Ссылки на спек
- Секция 14.3 (Structured Data schema.org)
- Секция 14.4 (Local SEO)

## Требования к тестам
- JSON-LD валиден (парсится как JSON)
- MedicalBusiness содержит обязательные поля
- FAQPage генерируется из faq массива
- Запусти тесты

## Ожидаемый результат
Полная разметка schema.org для поисковых систем.
