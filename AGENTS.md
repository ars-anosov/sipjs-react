# AGENTS.md — sipjs-react

WebRTC-телефон: SIP (sip.js), видеовстречи LiveKit, AD-авторизация. Общаться, документировать и
комментировать по-русски.

Единственный источник правил для AI-агентов. Адаптеры (`CLAUDE.md`, `.github/copilot-instructions.md`,
`.cursor/rules/project.mdc`, `.codex/codex.md`) — тонкие ссылки сюда, без дублирования. Общие
правила среды DSH — в user-global `~/.dsh/AGENTS.md`; проверка UI — навыком `.dsh/skills/ui-verify`.

## Стек и команды

Node.js 24, Vite 8, React 19, MUI 9 + Emotion, Redux 5 (thunk; `redux-logger` в dev),
react-router-dom 7 (HashRouter), sip.js, livekit-client + `@livekit/components-react`, ky,
date-fns. Только JavaScript, форматирование — Biome. Тестов нет.

- `npm run dev` — Vite на порту 3000 (занят → следующий свободный, брать фактический из вывода);
  `npm run build` — сборка в `dist`; `npm run serve` — preview, порт из вывода (по умолчанию 4173).
- `npm run lint` — только проверка; `npm run format`/`npm run check` **перезаписывают файлы**.
- CI (`.github/workflows/ci.yml`): push в `main`/`master` — `npm ci` + `npm run build`.

## Архитектурные границы

- `services/` не зависят от Redux, общаются с actions через колбэки: `phoneRuntime`/`lkRuntime`
  (singleton-runtime SIP и LiveKit-медиа), `adAuth` (AD-сессия, пробивка PHP-сессии по
  `uriAdPhpAuth`), `lkToken` (токен LiveKit, срок действия, приглашения), `phoneDirectory`,
  `phoneNotifications`, `phoneStorage`. Весь `localStorage` и весь HTTP (`ky`) — только здесь;
  ключи — `constants/storage.js`.
- Redux хранит только UI-флаги/заголовки/списки/счётчики — не SDK-объекты и не медиа.
  `store/preloadedState.js` собирает сид из сервисов и отдаёт срезы в `configureStore`
  (`createStore(preloadedState)` + `authTimeoutMiddleware`); reducers чистые и не импортируют
  сервисы. Action types — `constants/redux.js` (префиксы `PHONECTL_`, `AUTHCTL_`,
  `LKTOKEN_`/`LKROOM_`/`LK_`).
- Namespace-инвариант: thunk-и `AUTHCTL_`, `PHONECTL_`, `LK_` не диспатчат чужой префикс и не
  читают чужой срез через `getState()`. Мосты — только в контейнерах: `AuthContainer`
  (AUTHCTL↔PHONECTL, URL→LK), `PhoneContainer` (URL→PHONECTL; кнопка LiveKit переключает
  `lkControlRdcr.displayControl`), `LkContainer` (приглашение → чат). Владение рендером — по
  срезу (`AuthContainer` — `AuthLinks`/`AuthAd`/`AuthPad`, `PhoneContainer` — `PhoneReg`/`PhonePad`/
  `PhoneHistory`/`PhoneChat`).
- `phoneControlRdcr.regState` (`off`/`ok`/`fail`) — единственный флаг SIP-регистрации; тумблер
  `AuthPad` трёхпозиционный и отражает его напрямую (нет отдельного булева флага).
- Своя LiveKit-комната и приглашение доступны только при живой SIP-регистрации
  (`regState === "ok"`, номер комнаты — `callerUserNum`); приглашение уходит SIP MESSAGE, AD для
  этого не нужен. Список приглашений — `localStorage.lkInvites` (лимит `LK_MAX_INVITES`).
- `AuthAd` открывается только неуспешной пробивкой PHP-сессии (`GET uriAdPhpAuth?PHPSESSID=...`);
  успех — тихий вход без формы, ошибкой AD пробивка не считается.
- Компоненты не импортируют sip.js/livekit-client и не работают с runtime напрямую — только
  пропсы + `*Actions` (исключения: `PhoneIco`→`phoneNotifications`, `LkMeet`→`lkRuntime`,
  `AuthAd`→`adAuth`).

Полные потоки и Mermaid-диаграммы — `docs/STATE.md`; стенд LiveKit (OpenVidu-докер), токены и
грабли проверки — `docs/LIVEKIT.md`; dev-mock — `mock/vite-mock-api.js`.

## Соглашения

- React: функциональные компоненты, `PropTypes`; презентация — `components/`, связка со store —
  `containers/` (`useSelector`, `bindActionCreators` + `useMemo`). UI — только MUI.
- Biome: 2 пробела, без Tab, двойные кавычки; с автоформатом не спорить. Vite `base: './'` сохранять.
- Диаграммы-артефакты — навык `archify` → `docs/archify/` (`sipjs-react-layers.*`,
  `sipjs-react-auth-bridge.*`, `sipjs-react-sip-store.*`, `sipjs-react-livekit-store.*`), проверка
  — навык `archify-visual-check`; для Mermaid в ответе эталон — `docs/STATE.md`.
- Внешние библиотеки (sip.js, LiveKit): перед использованием незнакомого метода сверяться с
  официальной документацией и давать в ответе ссылку на неё; API по памяти не выдумывать.

## Работа агента

1. Senior FullStack-разработчик; минимальный необходимый diff — не расширять объём без запроса.
2. Без TS/тестов/CI/новых зависимостей/инфраструктуры без явного запроса. `dist` не редактировать
   вручную — только `npm run build`.
3. Проверка соразмерно изменению: diff → при необходимости `npm run lint`/`npm run build` →
   браузер только для рантайма, вёрстки или консоли (навык `ui-verify`). Для критичных изменений
   в ответе — риски и фактически выполненная проверка.
4. Русский язык в документации, комментариях и ответах.
5. При смене соглашений править этот файл; адаптеры не дублируют правила.
