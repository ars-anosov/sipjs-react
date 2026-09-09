# CLAUDE.md — sipjs-react

WebRTC-телефон: SPA на sip.js и LiveKit.
Язык документации, комментариев и ответов — русский.

Канон для агентов. Копии: `.github/copilot-instructions.md`, `.github/copilot.yml`,
`.cursor/rules/*.mdc`, `.codex/codex.md`. При смене соглашений синхронизировать.

## Где код

- исходники: `src/`
- mock API (dev): `mock/`
- сборка: `npm run build` → `dist` (не править вручную)

## Компоненты

| Файл | Назначение |
|------|------------|
| `PhoneReg.jsx` | SIP-регистрация |
| `PhonePad.jsx` | набор номера и звонки |
| `PhoneChat.jsx` | SIP-чат |
| `PhoneHistory.jsx` | история звонков |
| `PhoneDir.jsx` | справочник |
| `AuthAd.jsx` | AD-авторизация (POST) |
| `LkMeet.jsx` | видеовстреча LiveKit |
| `MenuAppBar.jsx` | верхнее меню |

Контейнеры: `PhoneContainer`, `LkContainer`, `MenuAppContainer`.

`AuthAd` ожидает JSON: `sip_username`, `sip_secret`, `lk_token`, `ad_login`, `ad_cn`, `ad_title`, `ad_department`.

## Структура

```
sipjs-react/
├── src/
│   ├── components/
│   ├── containers/
│   ├── actions/          # *Actions; SIP runtime — phoneRuntime.js
│   ├── reducers/         # *Rdcr
│   ├── store/
│   ├── constants/        # redux.js, storage.js
│   └── theme.js
├── mock/
├── dist/
└── tools/                # заметки по Node.js, Vite, MUI
```

## Стек

React 19, Vite 8, MUI 9, Redux 5 + thunk, sip.js, livekit-client, `@livekit/components-react`, ky.
JavaScript (`.js` / `.jsx`), без TypeScript.

## Команды

```bash
npm install
npm run dev      # http://0.0.0.0:3000
npm run build    # → dist
npm run serve    # preview, порт 4173
```

## Соглашения

- Компоненты функциональные; публичные props — `PropTypes`.
- UI — Material UI. Презентация в `components/`, store — в `containers/`.
- В контейнерах: `useSelector`, `bindActionCreators` + `useMemo`.
- Action types — `constants/redux.js`: `PHONECTL_`, `AUTHCTL_`, `LKTOKEN_` / `LK_`.
- Reducers / actions: `phoneControl`, `authControl`, `lkControl` (`*Rdcr` / `*Actions`).
- Объекты sip.js живут в `phoneRuntime.js`, не в Redux.
- HTTP — `ky`; ошибки — `actions/utils/kyError.js`.
- Ключи `localStorage` — `constants/storage.js`.
- Vite `base: './'` — относительные пути в `dist`.
- Отступ — 2 пробела, без Tab.

## Правила для агента

1. Минимальный diff, без расширения объёма.
2. Для критичных изменений — риски и шаги проверки.
3. Без TypeScript, тестов, CI, новых зависимостей и инфраструктуры без явного запроса.
4. `dist` не редактировать вручную.
