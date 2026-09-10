# AGENTS.md — sipjs-react

**Проект:** WebRTC-телефон — SPA на [sip.js](https://sipjs.com/) и [LiveKit](https://livekit.io/)
**Язык общения, документации и комментариев:** русский

Единственный источник правил для AI-агентов. Файлы инструментов — тонкие адаптеры на этот
документ (`CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/project.mdc`,
`.codex/codex.md`); правила здесь, в адаптерах — ничего не дублировать.

## Назначение

SPA-телефон: SIP-регистрация и звонки через sip.js, текстовый SIP-чат (MESSAGE), справочник,
история звонков и видеовстречи LiveKit. Дополнительно — авторизация через внешний AD-сервис,
которая отдаёт SIP- и LiveKit-реквизиты. Рабочее приложение — в корне проекта, готовая сборка — `dist`.

## Компоненты

| Файл | Назначение |
|------|------------|
| `PhoneReg.jsx` | SIP-регистрация: URI WebRTC, номер, пароль, ICE |
| `PhonePad.jsx` | набор номера, исходящий звонок, DTMF, удержание |
| `PhoneIco.jsx` | индикатор телефона, входящий/исходящий звонок, Service Worker + Notification |
| `PhoneChat.jsx` | SIP-чат (MESSAGE), статусы доставки |
| `PhoneHistory.jsx` | история звонков из `localStorage` |
| `PhoneDir.jsx` | телефонный справочник (GET) |
| `AuthAd.jsx` | AD-авторизация (POST) |
| `AuthAdInfo.jsx` | информация о текущей AD-сессии |
| `AuthIco.jsx` | иконка статуса AD-авторизации |
| `LkMeet.jsx` | видеовстреча LiveKit (комната, дорожки, приглашение) |
| `LkToken.jsx` | форма запроса LiveKit-токена и приглашения |
| `LkThemeStyles.js` | стили LiveKit под MUI |
| `MenuAppBar.jsx` | верхнее меню, переключение экранов |
| `Copyright.jsx` | копирайт и версии зависимостей |

Контейнеры: `PhoneContainer`, `LkContainer`, `MenuAppContainer`.

`AuthAd` ожидает JSON: `sip_username`, `sip_secret`, `lk_token`, `ad_login`, `ad_cn`,
`ad_title`, `ad_department`.

## Структура

```
src/
├── components/      # UI-компоненты (PhoneReg, PhonePad, AuthAd, LkMeet, …)
├── containers/      # Redux-контейнеры (PhoneContainer, LkContainer, MenuAppContainer)
├── actions/         # *Actions; utils/ — kyError.js
├── services/        # SIP/WebRTC-слой — phoneRuntime.js
├── reducers/        # *Rdcr, rootReducer.js, authTimeoutMiddleware.js
├── store/           # configureStore.js
├── constants/       # redux.js (action types), storage.js (ключи localStorage)
├── main.jsx, App.jsx, theme.js
mock/                # mock API для dev (vite-плагин, только serve)
public/              # статика: img/, sounds/sipjs/, sw.js
dist/                # результат npm run build — вручную не править
```

## Стек и команды

Node.js 24 (`.devcontainer/devcontainer.json`), Vite 8 (rolldown), React 19, Material UI 9 +
Emotion, Redux 5 (redux-thunk, redux-logger в dev, react-redux), react-router-dom 7 (HashRouter),
sip.js, livekit-client + `@livekit/components-react`, ky, date-fns.
Язык — JavaScript (`.jsx` / `.js`), без TypeScript. Формат — Biome (`biome.json`).

```bash
npm install
npm run dev      # dev-сервер, http://0.0.0.0:3000
npm run build    # сборка в dist
npm run serve    # preview, порт 4173
npm run lint     # biome lint .
npm run format   # biome format --write .
npm run check    # biome check --write .
```

Тестового скрипта нет.

## Архитектура

- Все объекты sip.js и медиа живут в модуле `src/services/phoneRuntime.js` (singleton):
  `userAgent`, `registerer`, сессии (`incomingSession` / `outgoingSession`), аудиоэлементы,
  `remoteStream`. Доступ — через `getPhoneRuntime` / `setPhoneRuntime` / `resetPhoneRuntime`;
  `phoneRuntime` также реэкспортирует нужные типы sip.js.
- Компоненты не импортируют `sip.js` напрямую и не работают с runtime — только через пропсы
  состояния и связанные `*Actions` из контейнеров.
- Redux — три среза в `rootReducer`: `phoneControlRdcr`, `authControlRdcr`, `lkControlRdcr`.
  Store хранит UI-флаги, заголовки, списки звонков и сообщений, счётчики непрочитанного и
  поля ошибок. Полные объекты sip.js, сессии и медиа в store не попадают.
- Actions — thunk-и: валидируют ввод, вызывают `phoneRuntime` / HTTP и диспатчат actions.
  Reducers чистые, без sip.js-логики; `authTimeoutMiddleware` раз в 10 с проверяет срок
  AD-сессии и очищает её по истечении (24 ч).
- `configureStore` подключает `thunk` и `authTimeoutMiddleware`; `redux-logger` — только в dev.

## Потоки

- **AD-авторизация:** `AuthAd` → `authControlActions.handleAdRegister` → `POST uriAdAuth`
  с `{ login, password }` → `AUTHCTL_SUBMIT_SUCCESS` + заполнение `PhoneReg`
  (`sip_username`, `sip_secret`) и автозапуск `handleClkRegister`.
- **SIP-регистрация:** `phoneControlActions.handleClkRegister` → `UserAgent` / `Registerer`
  в `phoneRuntime` → `PHONECTL_CONNECT_*`; переподключение — `PHONECTL_RECONNECT_TRY`;
  звонки — `PHONECTL_INCOME_*` / `PHONECTL_OUTGO_SUBMIT`, сброс — `PHONECTL_CLK_RESET`.
- **Чат:** `handleSendMessage` → `transmitSipMessage` (MESSAGE активной сессии или `Messager`);
  статусы `sending` / `delivered` / `error`; хранение — `CHAT_STORAGE_KEY`.
- **LiveKit:** `lkControlActions.handleLkTokenSubmit` → `POST uriLkToken` с `{ num, room }` →
  `LKTOKEN_SUBMIT_SUCCESS` + SIP MESSAGE со ссылкой на встречу; `LkMeet` читает `lk_room` и
  `lk_token` из query-параметров.

## Mock API

`mock/vite-mock-api.js` — плагин Vite (`apply: "serve"`), работает только в dev:
`POST /user/ad`, `POST /user/lk`, `GET /user/phonedir`. Токен LiveKit подписывается dev-ключом.

## Соглашения кода

- **React:** функциональные компоненты, `PropTypes` для публичных props; презентация — в
  `components/`, связка со store — в `containers/` (`useSelector`, `bindActionCreators` +
  `useMemo`). UI — только Material UI.
- **Redux:** action types — константы в `constants/redux.js` с префиксами `PHONECTL_`,
  `AUTHCTL_`, `LKTOKEN_` / `LK_`; reducers `phoneControlRdcr`, `authControlRdcr`, `lkControlRdcr`;
  actions `phoneControlActions`, `authControlActions`, `lkControlActions`.
- **Прочее:** ключи `localStorage` — в `constants/storage.js`; запросы — через `ky`, ошибки HTTP —
  `actions/utils/kyError.js` (`getApiErrorMessage`); Vite `base: './'` — сохранять относительные
  пути для статического деплоя из `dist`.
- **Формат:** Biome — отступ 2 пробела, только `Space`, символы `Tab` не добавлять, кавычки
  двойные; с автоформатом не спорить.

## CI

`.github/workflows/ci.yml` — на push в `main`/`master`: Node.js 24, `npm ci`, `npm run build`.

## Правила для агента

1. Действовать как senior FullStack-разработчик.
2. Не расширять объём правок без запроса — минимальный необходимый diff.
3. Для критичных изменений указывать риски и шаги проверки.
4. Не добавлять TypeScript, тесты, CI, новые зависимости и инфраструктуру без явного запроса.
5. Не редактировать `dist` вручную — только через `npm run build`.
6. Сохранять русский язык в документации, комментариях и ответах.
7. При смене соглашений править этот файл; адаптеры не дублируют правила.
