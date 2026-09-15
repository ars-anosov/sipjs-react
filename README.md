# sipjs-react

WebRTC-телефон: SIP-клиент на [sip.js](https://sipjs.com/), видеовстречи на [LiveKit](https://livekit.io/) и авторизация через Active Directory (внешний AD-API).

![phone](img/phone.png)

Сборка — `npm run build` в `dist/` (каталог в git не хранится).

## Быстрый старт

Требуется Node.js 24.

```bash
npm install
npm run dev     # Vite dev-сервер: http://localhost:3000 (host 0.0.0.0)
npm run build   # сборка в dist
npm run serve   # предпросмотр сборки: http://localhost:4173 (vite preview, host 0.0.0.0)
```

Проверки и форматирование — Biome (`format` и `check` пишут правки в файлы):

```bash
npm run lint    # только проверка
npm run format  # форматирование с записью
npm run check   # линт + форматирование с записью
```

В dev-режиме Vite поднимает мок-API.

# Компоненты

Презентационные компоненты (`src/components/`) получают данные и `*Actions` пропсами; со стором их связывают контейнеры (`src/containers/`): `PhoneContainer`, `AuthContainer`, `LkContainer`, `MenuAppContainer`.

## MenuAppBar.jsx
Меню приложения: пункты «SIP …» (`phoneControlRdcr`), «AD …» (`authControlRdcr`), «LiveKit Встреча» (`lkControlRdcr`).

## PhoneReg.jsx
![component_PhoneReg.png](img/component_PhoneReg.png)

## PhonePad.jsx
![component_PhonePad.png](img/component_PhonePad.png)

## PhoneHistory.jsx
![component_PhoneHistory.png](img/component_PhoneHistory.png)

## PhoneIco.jsx
![component_PhoneIco.png](img/component_PhoneIco.png)

## PhoneChat.jsx
Чат по SIP MESSAGE

# Доп. компоненты
Плюшки для интеграции с внешними сервисами

## AuthAd.jsx
POST-запрос к серверу авторизации, ожидаемый ответ:
```json
{
  "sip_username"  : "1234",
  "sip_secret"    : "SECRET",
  "lk_token"      : "LiveKit Token",
  "ad_login"      : "login",
  "ad_cn"         : "ФИО",
  "ad_title"      : "Должность",
  "ad_department" : "Отдел"
}
```

![component_AuthAd.png](img/component_AuthAd.png)

## AuthPad.jsx
Панель «Мост к сервисам»: тумблеры SIP-регистрации (`autoReg`) и показа LiveKit-встречи (`lkControlRdcr.displayControl`), кнопка закрытия и текст с недостающими AD-данными.

## AuthIco.jsx + AuthAdInfo.jsx
Индикация данных AD-сессии в интерфейсе.

## LkMeet.jsx
Видеовстреча на [LiveKit](https://livekit.io/) (локальный деплой — [openvidu-local-deployment](https://github.com/OpenVidu/openvidu-local-deployment)); комната из query `lk_room`/`lk_token`.

![component_LkMeet.png](img/component_LkMeet.png)

## LkToken.jsx
Форма приглашения внутри `LkMeet`: поле «Вн. номер», `room`/`uriLkToken` берутся из стора. `POST uriLkToken` выполняет thunk `handleLkTokenSubmit`.

## LkThemeStyles.js
Стили LiveKit-компонентов под тему MUI.

## PhoneDir.jsx
GET-запрос к серверу справочнику, ожидаемый ответ:
```json
[
  { "label": "Москва префикс", "prefix": "1999" },
  { "label": "Спб префикс", "prefix": "1923" },
  { "label": "Пользователь с длинным именем каким-то", "num": "9991", "email": "user@example.com" },
  { "label": "Пользователь без почты", "num": "9992" }
]
```

![component_PhoneDir.png](img/component_PhoneDir.png)

# Документация

[![Архитектура sipjs-react](docs/archify/sipjs-react-architecture.visual-check.2048x1320.light.png)](https://ars-anosov.github.io/sipjs-react/archify/sipjs-react-architecture.html)

Все документы: <https://ars-anosov.github.io/sipjs-react/>

# Пакеты

Зависимости — в `package.json`, установка — `npm install`. Обновление мажорных версий:

```bash
npx npm-check-updates
```

# Лицензия

MIT, см. [LICENSE](LICENSE).
