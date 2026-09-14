---
name: ui-verify
description: Проверить UI-правку sipjs-react в настоящем браузере — поднять dev-сервер на порту 3000, открыть телефон через Windows-браузер и подтвердить поведение в Playwright MCP (снапшот, клик, консоль). Учитывает границу проверки — SIP-регистрация, звонки и медиа требуют живого сервера и разрешений микрофона и камеры, мок их не заменяет.
whenToUse: Правка в src/components, src/containers, src/reducers, theme.js или mock/ — перед ответом пользователю.
---

# Проверка UI-правки sipjs-react

Общий порядок — dev-сервер, `win_open_url`, активация Playwright MCP, требование фактов в отчёте —
в user-global `~/.dsh/AGENTS.md`. Ниже только специфика этого репозитория.

## Что поднимать

```bash
npm run dev
curl -sf -o /dev/null http://localhost:3000/ && echo ready
```

Порт 3000, `host: 0.0.0.0`, `watch.usePolling: true` — в WSL правки подхватываются без
перезапуска сервера. Открыть `http://localhost:3000` через `win_open_url`, дальше работать в
`mcp__browser__*` (сначала `mcp__router__search_and_activate`, serverName `browser`).

## Что реально проверяется локально

- Mock API — Vite-плагин `mock/vite-mock-api.js` (`apply: "serve"`, только dev): `POST /user/ad`,
  `POST /user/lk`, `GET /user/phonedir`. AD-мок отдаёт `sip_username: 9993` и **пустой
  `sip_secret`**, `lk_token` подписан dev-ключом.
- Поэтому без живого SIP-сервера проверяются: рендер и валидация формы `PhoneReg`, тумблеры и
  тексты `AuthPad`, пункты меню и переходы HashRouter, флаги Redux, обработка ошибок `ky`
  (`actions/utils/kyError.js`), показ `LkMeet` с текстом «AD не выполнен / нет `lk_token`».
- SIP-регистрация, звонки, медиа и конференция LiveKit требуют доступного сервера (`uriWebRtc` —
  wss, `uriLk`/`uriLkToken`) и разрешений микрофона и камеры в Chrome. Мок их не заменяет: если
  сервера нет, проверить UI-уровень и прямо написать, что сам звонок не проверялся.

## Что смотреть

- Адреса сервисов лежат в `localStorage` (`src/constants/storage.js`: `uriAdAuth`, `uriWebRtc`,
  `uriPhoneDir`, `uriLk`, `uriLkToken`) — для сквозной проверки подставить их в UI, сброс сессии
  очищает значения.
- `LkMeet` берёт `lk_room`/`lk_token` из query маршрута (HashRouter, вид `#/?lk_room=...`).
- Dev-сборка включает `redux-logger`: по логу действий проверяются порядок dispatch и
  namespace-инвариант (`AUTHCTL_` не диспатчит `PHONECTL_`, мосты — только в `AuthContainer`).
- Service Worker и Notifications (`phoneNotifications`) в браузере требуют разрешения на
  уведомления: отказ или отсутствие поддержки даёт информационный текст, а не падение.

## Уборка

Закрыть окно Chrome (профиль Playwright постоянный — иначе следующая сессия браузер не запустит) и
остановить job dev-сервера.
