# CODEX — sipjs-react

**Проект:** ReactJS-компоненты на базе sip.js и livekit
**Язык общения и документации:** русский

---

## Назначение

Библиотека/демо React-компонентов для работы с sip.js и livekit. Основной код — SPA в `phone/`, готовая сборка — `phone/dist`.

---

## Структура репозитория

```
sipjs-react/
├── phone/                # рабочее приложение (Vite + React)
│   ├── src/
│   │   ├── components/   # UI-компоненты
│   │   ├── containers/   # Redux-контейнеры
│   │   ├── actions/      # Redux actions
│   │   ├── reducers/     # Redux reducers
│   │   ├── store/        # store
│   │   └── constants/    # константы
│   ├── mock/             # mock API (vite plugin)
│   ├── dist/             # результат npm run build
│   └── package.json
├── tools/                # заметки по Node.js, Vite, MUI
└── img/                  # скриншоты для README
```

---

## Стек

- **Runtime:** Node.js 24 (см. `.devcontainer/devcontainer.json`)
- **Сборка:** Vite 8, `@vitejs/plugin-react`
- **UI:** React 19, Material UI 9, Emotion
- **Состояние:** Redux 5, redux-thunk, redux-logger, react-redux
- **sipjs:** sip.js
- **HTTP:** ky
- **Язык:** JavaScript (`.jsx`/`.js`), без TypeScript

---

## Команды

```bash
cd phone
npm install
npm run dev      # dev-сервер, порт 3000, host 0.0.0.0
npm run build    # сборка в phone/dist
npm run serve    # preview, порт 4173
```

---

## Соглашения кода

### Redux

- Action types: `constants/redux.js` (`PHONECTL_*`, `AUTHCTL_*`)
- Reducers: `*Rdcr` (`phoneControlRdcr`, `authControlRdcr`)
- Actions передаются в компоненты через `bindActionCreators` в контейнерах

### React

- Функциональные компоненты, `PropTypes` для props
- Презентация — `components/`, логика store — `containers/`

### Прочее

- Ключи `localStorage` — `constants/storage.js`
- Ошибки HTTP — `actions/utils/kyError.js`
- Vite `base: './'` — относительные пути для статического деплоя

---

## Правила для агента

1. Действуй как senior FullStack-разработчик.
2. Не расширяй объём правок без запроса.
3. Для критичных изменений указывай риски и шаги проверки.
4. Не добавляй TypeScript, тесты, CI и новые зависимости без явного запроса.
5. Не редактируй `phone/dist` вручную — только `npm run build`.
6. Сохраняй русский язык в документации и комментариях.
