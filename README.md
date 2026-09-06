# AuthKeys

Своя база данных API/auth-ключей с панелью управления. Next.js 14 (App Router) +
Upstash Redis как хранилище + деплой на Vercel.

## Возможности

- Генерация ключей вида `ak_live_xxxxxxxxxxxxxxxxxxxxxxxx`
- Секрет показывается **один раз** при создании — в базе хранится только его SHA-256-хэш
- Название, права доступа (scopes), срок действия (или бессрочно)
- Отзыв (revoke) и удаление ключей
- Счётчик использований и дата последнего использования
- Поиск и фильтры по статусу (активен / отозван / истёк)
- Публичный эндпоинт `POST /api/keys/validate` для проверки ключа из внешних
  сервисов, со встроенным rate limiting (Upstash Ratelimit)
- Панель защищена паролем администратора (без сторонних auth-провайдеров)

## Стек

- **Next.js 14** — фронтенд и API-роуты, деплой на **Vercel**
- **Upstash Redis** — хранилище ключей (REST API, работает из serverless/edge)
- **Upstash Ratelimit** — защита эндпоинта проверки ключей от перебора
- Код — в **GitHub**, откуда Vercel собирает и деплоит проект автоматически

Про "без лимитов": у Upstash нет фиксированного бесплатного лимита запросов
в месяц, как у многих alternatives — тариф Pay-as-you-go считает по факту
использования, а бесплатный порог (10 000 команд/день на момент написания)
обычно с запасом хватает для одной панели ключей. Проверьте актуальные условия
на upstash.com/pricing.

## Локальный запуск

```bash
npm install
cp .env.example .env.local
# заполните .env.local своими значениями
npm run dev
```

## Деплой

### 1. Залить код на GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create authkeys --private --source=. --push
# либо создайте репозиторий на github.com и сделайте git push вручную
```

### 2. Создать базу в Upstash

1. Зарегистрируйтесь на [upstash.com](https://upstash.com)
2. Создайте Redis-базу (регион — ближайший к вашим Vercel-функциям)
3. В настройках базы найдите **REST API** → скопируйте `UPSTASH_REDIS_REST_URL`
   и `UPSTASH_REDIS_REST_TOKEN`

Проще всего: при импорте проекта в Vercel выберите интеграцию
**Upstash** в Marketplace — она сама создаст базу и подставит переменные
окружения в проект.

### 3. Задеплоить на Vercel

1. [vercel.com/new](https://vercel.com/new) → импортируйте репозиторий с GitHub
2. Добавьте переменные окружения (Project Settings → Environment Variables):
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `ADMIN_PASSWORD` — пароль для входа в панель
   - `AUTH_SECRET` — любая длинная случайная строка (например, `openssl rand -hex 32`)
3. Нажмите Deploy

После деплоя откройте домен, войдите с `ADMIN_PASSWORD` и создайте первый ключ.

## Проверка ключа из внешнего сервиса

```bash
curl -X POST https://ваш-домен.vercel.app/api/keys/validate \
  -H "Authorization: Bearer ak_live_ваш_секрет"
```

Ответ:

```json
{ "ok": true, "key": { "id": "...", "name": "...", "scopes": ["read"], "usageCount": 1 } }
```

или при невалидном/отозванном/истёкшем ключе — `{"ok": false, "reason": "revoked"}`
с кодом `401`.

## Структура проекта

```
app/
  page.tsx                  # панель управления (dashboard)
  login/page.tsx             # страница входа
  api/
    auth/login/route.ts      # проверка пароля, выдача сессии
    auth/logout/route.ts     # выход
    keys/route.ts            # список + создание ключей
    keys/[id]/route.ts        # отзыв / удаление конкретного ключа
    keys/validate/route.ts   # публичная проверка ключа (rate-limited)
lib/
  redis.ts                   # клиент Upstash
  keys.ts                    # вся бизнес-логика хранения ключей
  session.ts                 # подпись/проверка сессионной cookie
middleware.ts                 # защита панели и API паролем
```

## Расширение функционала

Идеи, которые легко добавить поверх текущей базы:

- Роли/команды — несколько администраторов с разными правами
- Вебхуки при создании/отзыве ключа
- Экспорт списка ключей в CSV
- Графики использования по дням (Upstash Redis отлично хранит time-series)
- Привязка ключа к проекту/клиенту (доп. поле + фильтр)
