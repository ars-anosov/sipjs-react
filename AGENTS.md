# AGENTS.md — sipjs-react

WebRTC-телефон: SIP (sip.js), видеовстречи LiveKit, AD-авторизация. Язык общения, документации и комментариев — русский.

Единственный источник правил для AI-агентов. Адаптеры (`CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/project.mdc`, `.codex/codex.md`) — тонкие ссылки сюда, без дублирования.

## Стек и команды

Node.js 24, Vite 8, React 19, MUI 9 + Emotion, Redux 5 (redux-thunk; logger в dev), react-router-dom 7 (HashRouter), sip.js, livekit-client + `@livekit/components-react`, ky, date-fns. JavaScript (без TS). Формат — Biome.

`npm run dev | build | serve | lint | format | check`. Тестов нет.

## Структура

```
src/
├── components/   # UI: PhoneReg, PhonePad, PhoneChat, PhoneHistory, PhoneDir, AuthAd/AuthAdInfo/AuthIco/AuthPad, LkMeet/LkToken/LkThemeStyles, MenuAppBar, PhoneIco
├── containers/   # Redux-контейнеры: PhoneContainer, AuthContainer, LkContainer, MenuAppContainer
├── actions/      # thunks; utils/kyError.js
├── services/     # phoneRuntime, lkRuntime, phoneNotifications, phoneStorage
├── reducers/     # phoneControlRdcr, authControlRdcr, lkControlRdcr, authTimeoutMiddleware, rootReducer
├── store/        # configureStore.js
├── constants/    # redux.js (action types), storage.js (ключи localStorage), ui.js (HEADER_BACKGROUND, PANEL_HEIGHT)
└── App.jsx, main.jsx, theme.js, Copyright.jsx
mock/  public/  dist/   # dev-мок, статика, сборка (dist — только npm run build)
docs/                   # документация и GitHub Pages (ars-anosov.github.io/sipjs-react):
                        # index.html (лендинг), STATE.md (Mermaid-схемы), archify/ (генерация
                        # skill'ом archify, исключён из Biome)
```

## Архитектура

- Сервисы (`services/`) не зависят от Redux; общаются с actions через колбэки:
  `phoneRuntime` (sip.js + SIP-медиа, singleton), `lkRuntime` (LiveKit-комната, singleton),
  `phoneNotifications` (Service Worker/Notification), `phoneStorage` (localStorage).
- Компоненты не импортируют `sip.js` и не работают с SIP-runtime — только пропсы + `*Actions`.
  Исключения: `PhoneIco` → `phoneNotifications`, `LkMeet` → `lkRuntime`.
- Redux: `phoneControlRdcr`, `authControlRdcr`, `lkControlRdcr`. В store — только UI-флаги,
  заголовки, списки и счётчики; sip.js-объекты/сессии/медиа не хранятся.
- Actions — thunks (валидация → сервис/HTTP → dispatch). Reducers чистые.
- Namespace-инвариант: thunks `AUTHCTL_` не диспатчат `PHONECTL_` (и наоборот). Мосты между
  срезами (`AUTHCTL_` ↔ `PHONECTL_`) — только в контейнере `AuthContainer`.
- `authTimeoutMiddleware` — раз в 10 с проверяет срок AD-сессии (24 ч).
- `AuthAd` ожидает JSON: `sip_username`, `sip_secret`, `lk_token`, `ad_login`, `ad_cn`, `ad_title`, `ad_department`.

## Потоки

- AD: `handleAdRegister` → `POST uriAdAuth` → `AUTHCTL_SUBMIT_SUCCESS`. Далее мост `AuthContainer`: подставляет `sip_username`/`sip_secret` в PhoneReg; `AuthPad` видна по флагу меню `displayAuthPad` (✕ снимает флаг), автоматически показывается на `AUTHCTL_SUBMIT_SUCCESS` и скрывается на `AUTHCTL_CLEAR`; при отсутствии AD-данных информирует текстом, её тумблер `autoReg` — клик on сразу запускает `handleClkRegister` (без пары `sip_username`/`sip_secret` тумблер заблокирован); `sip_username` из PhoneReg синхронизируется обратно в `authControlRdcr.responseData`.
- LiveKit: `handleLkTokenSubmit` → `POST uriLkToken` → `LKTOKEN_SUBMIT_SUCCESS` + SIP MESSAGE-приглашение; `LkMeet` читает `lk_room`/`lk_token` из query. Показ `LkMeet` — флаг `lkControlRdcr.displayControl` (пункт меню «LiveKit Встреча» и тумблер «LiveKit Встреча» в `AuthPad`); если AD не выполнен или нет `lk_token`, `LkMeet` показывает информирующий текст, а тумблер заблокирован.
- SIP-регистрация/звонки/чат — см. `docs/STATE.md`.

## Mock API

`mock/vite-mock-api.js` (Vite-плагин, `apply: "serve"`, только dev): `POST /user/ad`, `POST /user/lk`, `GET /user/phonedir`. Токен LiveKit подписывается dev-ключом.

## Соглашения кода

- React: функциональные компоненты, `PropTypes`; презентация — `components/`, связка со store — `containers/` (`useSelector`, `bindActionCreators` + `useMemo`). UI — только MUI.
- Redux: action types — `constants/redux.js` (префиксы `PHONECTL_`, `AUTHCTL_`, `LKTOKEN_`/`LK_`).
- Прочее: ключи `localStorage` — `constants/storage.js`; HTTP — `ky`, ошибки — `actions/utils/kyError.js`; Vite `base: './'` сохранять.
- Формат: Biome — 2 пробела, только `Space` (без `Tab`), двойные кавычки; с автоформатом не спорить.

## CI

`.github/workflows/ci.yml` — push в `main`/`master`: Node.js 24, `npm ci`, `npm run build`.

## Инструменты и среда (DSH)

В профиле `web` плагины окружения подключены — инструменты доступны сразу, обходные пути не нужны.
Общие правила машины (WSL ↔ Windows, Playwright MCP, Mermaid, archify, проверка результата) — в
user-global `~/.dsh/AGENTS.md`; повторяемые процедуры — навыками в `.dsh/skills/`. Здесь только
специфика этого репозитория:

- **Диаграммы-артефакты** — skill `archify`, результат в `docs/archify/sipjs-react-architecture.*`;
  готовые HTML/JSON не править вручную, только перегенерация, проверка — навык
  `archify-visual-check`.
- **Диаграммы в ответе** — Mermaid-блоком, а не ASCII-артом; образец — `docs/STATE.md`.
- **Проверка UI** — `npm run dev` (порт 3000), открыть через `win_open_url`
  (`http://localhost:3000`); границы проверки (SIP, звонки и медиа требуют живого сервера) —
  навык `ui-verify` (`.dsh/skills/ui-verify`).

## Правила для агента

1. Senior FullStack-разработчик.
2. Минимальный необходимый diff — не расширять объём без запроса.
3. Для критичных изменений — риски и шаги проверки.
4. Без TS/тестов/CI/новых зависимостей/инфраструктуры без явного запроса.
5. Не редактировать `dist` вручную — только `npm run build`.
6. Русский язык в документации, комментариях и ответах.
7. При смене соглашений править этот файл; адаптеры не дублируют правила.
