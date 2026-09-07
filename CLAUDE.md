# CLAUDE.md — matrix-react

**Проект:** ReactJS-компоненты на базе sip.js и livekit
**Язык общения, документации и комментариев:** русский

Файл — основной источник правил для AI-агентов. Дублирующие инструкции для других
инструментов: `.github/copilot-instructions.md`, `.cursor/rules/*.mdc`, `.codex/codex.md`.
При изменении соглашений синхронизировать их с этим файлом.

---

## Назначение

Библиотека/демо React-компонентов для работы с sipjs и livekit. Рабочее приложение — SPA в `phone/`,
готовая сборка — `phone/dist`.

### Ключевые компоненты

| Компонент | Назначение |
|-----------|------------|
| `PhoneReg.jsx` | Регистрация и вход в sipjs |
| `PhonePad.jsx` | Чат-панель sipjs |
| `AuthAd.jsx` | Авторизация через внешний AD-сервис (POST, JSON: `ad_login`, `ad_cn`, `ad_title`, `ad_department`) |
| `AuthAdInfo.jsx`, `AuthIco.jsx` | Вспомогательные элементы авторизации |
| `MenuAppBar.jsx` | Верхнее меню приложения |

---

## Структура репозитория

```
matrix-react/
├── phone/                 # рабочее приложение (Vite + React)
│   ├── src/
│   │   ├── components/   # UI-компоненты (PhoneReg, PhonePad, AuthAd, …)
│   │   ├── containers/   # Redux-контейнеры (PhoneContainer, MenuAppContainer)
│   │   ├── actions/      # Redux actions (thunk)
│   │   ├── reducers/     # Redux reducers (*Rdcr)
│   │   ├── store/        # configureStore
│   │   ├── constants/    # action types, storage keys
│   │   └── theme.js      # тема MUI
│   ├── mock/             # mock API для dev (vite plugin)
│   ├── dist/             # результат npm run build
│   └── package.json
├── tools/                # заметки по Node.js, Vite, MUI
└── img/                  # скриншоты для README
```

---

## Стек

- **Runtime:** Node.js 24 (см. `.devcontainer/devcontainer.json`)
- **Сборка:** Vite 8, `@vitejs/plugin-react`
- **UI:** React 19, Material UI 9 (`@mui/material`, `@mui/icons-material`), Emotion
- **Состояние:** Redux 5, redux-thunk, redux-logger, react-redux, react-router-dom
- **sip.js:** sip.js
- **HTTP:** ky
- **Язык:** JavaScript (`.jsx` / `.js`), без TypeScript

---

## Команды

```bash
cd mtrx
npm install
npm run dev      # dev-сервер, http://0.0.0.0:3000
npm run build    # сборка в mtrx/dist
npm run serve    # preview, порт 4173
```

---

## Соглашения кода

### React

- Функциональные компоненты, `PropTypes` для публичных props.
- Презентационные компоненты — в `components/`, подключённые к store — в `containers/`.
- UI — только Material UI.

### Redux

- Action types — константы в `constants/redux.js` (префиксы `PHONECTL_`, `AUTHCTL_`).
- Reducers: `phoneControlRdcr`, `authControlRdcr`; actions: `phoneControlActions`, `authControlActions`.
- В контейнерах: `useSelector`, `bindActionCreators` + `useMemo`.

### Прочее

- Ключи `localStorage` — в `constants/storage.js`.
- Ошибки HTTP — `actions/utils/kyError.js`; запросы — через `ky`.
- Vite `base: './'` — сохранять относительные пути для статического деплоя из `dist`.

---

## Стиль оформления

- Отступ — `2` пробела.
- Для отступов использовать только символы `Space`; символы табуляции `Tab` в код не добавлять.
- Комментарии и документация — на русском, кратко и по делу.

---

## Правила для агента

1. Действовать как senior FullStack-разработчик.
2. Не расширять объём правок без запроса — минимальный необходимый диff.
3. Для критичных изменений указывать риски и шаги проверки.
4. Не добавлять TypeScript, тесты, CI, новые зависимости и инфраструктуру без явного запроса.
5. Не редактировать `phone/dist` вручную — только через `npm run build`.
6. Сохранять русский язык в документации, комментариях и ответах.
