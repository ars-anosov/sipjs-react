# AGENTS.md — sipjs-react

WebRTC-телефон: SIP (sip.js), видеовстречи LiveKit, AD-авторизация. Язык общения, документации и комментариев — русский.

Единственный источник правил для AI-агентов. Адаптеры (`CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/project.mdc`, `.codex/codex.md`) — тонкие ссылки сюда, без дублирования.

## Стек и команды

Node.js 24, Vite 8, React 19, MUI 9 + Emotion, Redux 5 (redux-thunk; logger в dev), react-router-dom 7 (HashRouter), sip.js, livekit-client + `@livekit/components-react`, ky, date-fns. JavaScript (без TS). Формат — Biome.

```bash
npm install
npm run dev      # dev-сервер, http://localhost:3000 (порт 3000 из vite.config.js)
npm run build    # сборка в dist
npm run serve    # предпросмотр собранного dist, порт из вывода (по умолчанию 4173)
npm run lint     # biome lint .
npm run format   # biome format --write .
npm run check    # biome check --write .
```

Тестов нет.

## Инструменты и среда (DSH)

Общие правила машины (WSL ↔ Windows, Mermaid, archify, проверка результата) — в user-global `~/.dsh/AGENTS.md`; повторяемые процедуры — навыками в `.dsh/skills/`. Здесь только специфика репозитория:

- **Диаграммы-артефакты** — skill `archify`, результат в `docs/archify/` (`sipjs-react-architecture.*`, `sipjs-react-sip-registration.*`); готовые HTML/JSON не править вручную, только перегенерация, проверка — навык `archify-visual-check`. В git остаются лишь `*.visual-check.2048x1320.light.png` (превью для README) и receipt `*.visual-check.json`, остальные скриншоты и contact sheet — временные (перечислены в `.gitignore`).
- **Диаграммы в ответе** — Mermaid-блоком, а не ASCII-артом; образец — `docs/STATE.md`.
- **Проверка UI** — `npm run dev` (порт 3000 из `vite.config.js`; если занят, Vite возьмёт следующий — дальше использовать фактический порт из вывода): человеку открывать `win_open_url` по этому порту, агенту — Linux-Chromium в WSL обёрткой `.dsh/bin/browser` (Playwright CLI, только headless). Настройки — `.playwright/cli.config.json` (chromium, viewport 1280×800, уровень `warning`, вывод в `.playwright/cache/output`). Файлы с авто-именами (`page-*`, `console-*`) там копятся: обёртка удаляет их старше суток, свежие за прогон убирает шаг 7 навыка `ui-verify`; рантайм демона — в игнорируемом `.playwright/cache/`. Обёртка уводит `HOME`/`XDG_CACHE_HOME` внутрь проекта, иначе песочница DSH не даёт Chrome записать профиль. Весь сценарий — одной цепочкой команд в одном вызове `bash` (демон CLI не переживает вызов). Порядок и границы проверки (SIP, звонки и медиа требуют живого сервера) — навык `ui-verify`.

## Структура

```
src/
├── components/   # UI: AuthLinks, PhoneReg, PhonePad, PhoneChat, PhoneHistory, PhoneDir, AuthAd/AuthAdInfo/AuthIco/AuthPad, LkMeet/LkToken/LkThemeStyles, MenuAppBar, PhoneIco
├── containers/   # Redux-контейнеры: PhoneContainer, AuthContainer, LkContainer, MenuAppContainer
├── actions/      # thunks; utils/kyError.js
├── services/     # adAuth, phoneRuntime, lkRuntime, lkToken, phoneDirectory, phoneNotifications, phoneStorage
├── reducers/     # phoneControlRdcr, authControlRdcr, lkControlRdcr, authTimeoutMiddleware, rootReducer
├── store/        # configureStore.js, preloadedState.js (сид из сервисов)
├── constants/    # redux.js (action types), storage.js (ключи и лимиты localStorage), ui.js
└── App.jsx, main.jsx, theme.js, Copyright.jsx
mock/             # mock API для dev (vite plugin, apply: "serve")
public/           # статика: img/, sounds/, sw.js
img/              # скриншоты компонентов для README
docs/             # документация и GitHub Pages (ars-anosov.github.io/sipjs-react):
                  # index.html (лендинг), STATE.md (Mermaid-схемы), archify/ (генерация skill'ом
                  # archify, исключён из Biome), .nojekyll
dist/             # результат npm run build — вручную не править
.github/          # CI (workflows/ci.yml: npm ci + build) и адаптер copilot-instructions.md
.dsh/             # навыки агента (skills/ui-verify) и обёртка bin/browser
.playwright/      # конфиг Playwright CLI (cli.config.json); cache/ — рантайм и вывод проверок
                  # (авто-имена page-*/console-* чистят обёртка и навык ui-verify), в git не хранится
.devcontainer/    # devcontainer: образ javascript-node 24, forwardPorts 3000 и 4173
.vscode/          # редактор: Biome-форматтер и formatOnSave, рекомендации расширений
.zed/             # Zed: Biome как LSP и форматтер для JS/JSON, исключения node_modules и dist
.cursor/          # адаптер правил для Cursor (rules/project.mdc)
.codex/           # адаптер правил для Codex (codex.md)
.editorconfig     # LF, финальный перевод строки, 2 пробела (в Markdown пробелы не обрезаются)
jsconfig.json     # настройки JS-проекта для редактора: ES2022, JSX react-jsx, Bundler
biome.json        # линтер и форматтер; includes исключает dist, node_modules, docs/archify
README.md         # описание проекта и быстрый старт (Node.js 24), скриншоты — в img/
LICENSE           # MIT
```

## Архитектура

- Сервисы (`services/`) не зависят от Redux и общаются с actions через колбэки: `phoneRuntime` (sip.js + SIP-медиа) и `lkRuntime` (LiveKit-комната) — singleton'ы, `adAuth` (AD-сессия и её срок), `lkToken` (конфиг LiveKit и токен), `phoneDirectory`, `phoneNotifications` (Service Worker/Notification), `phoneStorage` (настройки, звонки и чат в localStorage).
- Весь `localStorage` и весь HTTP (`ky`) — только в `services/`; ключи — в `constants/storage.js`. Исключения: `actions/utils/kyError.js` берёт из `ky` только `HTTPError`, а dev-дефолты адресов пишет корневой `index.html` (и только отсутствующие ключи).
- Со стором сервисы сводит только слой стора: `store/preloadedState.js` собирает геттерами сервисов сид (`uriAdAuth`, `uriLk`/`uriLkToken`, `uriWebRtc`, `callerUserNum`, `useIce`) и отдаёт срезы `initialState` в `configureStore`, который передаёт их в `createStore` как `preloadedState` и инжектит зависимости `authTimeoutMiddleware` (срок AD-сессии, проверка раз в 10 с). `initialState` редьюсеров остаётся чистым. Reducers и middleware сервисов не импортируют.
- Компоненты не импортируют `sip.js`/`livekit-client` и не работают с runtime напрямую — только пропсы + `*Actions` и узкий доменный API сервиса. Исключения: `PhoneIco` → `phoneNotifications`, `LkMeet` → `lkRuntime` и `@livekit/components-react`, `AuthAd` → `adAuth`.
- Redux: только UI-флаги, заголовки, списки и счётчики; sip.js-объекты/сессии/медиа не хранятся. Actions — thunks (валидация → сервис/HTTP → dispatch), reducers чистые. Thunk работает только со своим срезом: чужой срез не читает через `getState()`, а получает значения аргументом.
- Namespace-инвариант: thunks `AUTHCTL_` не диспатчат `PHONECTL_` (и наоборот). Мосты `AUTHCTL_` ↔ `PHONECTL_` — только в `AuthContainer`; остальные контейнеры раздают срезы пропсами (`LkContainer` → `phoneControlRdcr` для формы `LkToken`). Владение рендером — по срезу: `AuthContainer` (домен `authControlRdcr`, там же мост и стартовые ссылки `AuthLinks` на обе формы) рендерит `AuthLinks`, `AuthAd` и `AuthPad`, `PhoneContainer` (домен `phoneControlRdcr`) — `PhoneReg`, `PhonePad`, `PhoneHistory`, `PhoneChat`; чужой срез читает только `AuthContainer` — как мост. Стартовый экран: пока ни AD-сессия, ни SIP-регистрация не активны, видны только ссылки `AuthLinks`; успех AD → `AuthPad`, успешная SIP-регистрация → `PhonePad` (заголовок `App` — flex-колонка на высоту экрана).
- `phoneControlRdcr.regState` (`off`/`ok`/`fail`) — единственный флаг SIP-регистрации; проверки «зарегистрирован» — `regState === "ok"`, отдельного булева флага нет. Тумблер `AuthPad` трёхпозиционный и отражает `regState`: `off` — регистрация (без пары `sip_username`/`sip_secret` заблокирован), `ok` — разрегистрация, `fail` — возврат в `off`; при потере регистрации (`registrationLost`) показывается AuthPad с красным тумблером, а не `PhoneReg`.
- `lkControlRdcr.displayControl` — показ `LkMeet` (пункт меню «LiveKit Встреча» и тумблер в `AuthPad`); ключ `displayControl` есть и у «кругляшей» в `phoneControlRdcr`/`authControlRdcr`. `LkMeet` читает `lk_room`/`lk_token` из query; без AD или `lk_token` — информирующий текст, тумблер заблокирован.
- `AuthAd` ожидает JSON: `sip_username`, `sip_secret`, `lk_token`, `ad_login`, `ad_cn`, `ad_title`, `ad_department`.

Потоки (AD-вход, SIP-регистрация, звонки, чат) — в `docs/STATE.md`.

## Mock API

`mock/vite-mock-api.js` (Vite-плагин, `apply: "serve"`, только dev): `POST /user/ad`, `POST /user/lk`, `GET /user/phonedir`. Токен LiveKit подписывается dev-ключом.

## Соглашения кода

- React: функциональные компоненты, `PropTypes`; презентация — `components/`, связка со store — `containers/` (`useSelector`, `bindActionCreators` + `useMemo`). UI — только MUI.
- Redux: action types — `constants/redux.js` (префиксы `PHONECTL_`, `AUTHCTL_`, `LKTOKEN_`/`LK_`).
- Прочее: ключи `localStorage` — `constants/storage.js`; HTTP (`ky`) и `localStorage` — только в `services/`; ошибки — `actions/utils/kyError.js`; Vite `base: './'` сохранять.
- Формат: Biome — 2 пробела, только `Space` (без `Tab`), двойные кавычки; с автоформатом не спорить.
- Внешние библиотеки (sip.js, LiveKit): перед использованием незнакомого метода сверяться с официальной документацией, а в ответе давать ссылку на раздел документации этого метода; API по памяти не выдумывать.

## CI

`.github/workflows/ci.yml` — push в `main`/`master`: Node.js 24, `npm ci`, `npm run build`.

## Правила для агента

1. Senior FullStack-разработчик.
2. Минимальный необходимый diff — не расширять объём без запроса.
3. Для критичных изменений — риски и шаги проверки.
4. Без TS/тестов/CI/новых зависимостей/инфраструктуры без явного запроса.
5. Не редактировать `dist` вручную — только `npm run build`.
6. Русский язык в документации, комментариях и ответах.
7. Формат — по Biome: 2 пробела, только пробелы, без табов, двойные кавычки; с автоформатом не спорить.
8. Для каждого использованного метода внешних библиотек давать ссылку на официальную документацию этого метода; не выдумывать API по памяти, а сверяться с источником.
9. При смене соглашений править этот файл; адаптеры не дублируют правила.
