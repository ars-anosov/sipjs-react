# Инструкции для GitHub Copilot

Репозиторий **sipjs-react** — ReactJS-компоненты на базе sip.js и livekit.

## Где код

- Основное приложение: `phone/`
- Исходники: `phone/src/`
- Сборка: `npm run build` → `phone/dist`

## Компоненты Matrix

- `PhoneReg` — регистрация и вход
- `PhonePad` — телефон
- `AuthAd` — интеграция с AD-авторизацией

## Технологии

React 19, Vite 8, Material UI 9, Redux (thunk), matrix-js-sdk, ky.  
Проект на **JavaScript** — не предлагать миграцию на TypeScript без запроса.

## Стиль

- Документация и комментарии — на русском
- Redux: action types в `constants/redux.js`, reducers с суффиксом `Rdcr`
- Минимальный объём правок; не добавлять зависимости и инфраструктуру без запроса
