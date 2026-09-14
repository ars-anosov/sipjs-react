# sipjs-react

WebRTC-телефон: SIP-клиент на [sip.js](https://sipjs.com/), видеовстречи на [LiveKit](https://livekit.io/) и авторизация через внешний API.

![phone](img/phone.png)

Готовая сборка — в [dist](dist).

## Быстрый старт

Требуется Node.js 24.

```bash
npm install
npm run dev     # Vite dev-сервер: http://localhost:3000 (host 0.0.0.0)
npm run build   # сборка в dist
npm run serve   # предпросмотр сборки (vite preview, порт 4173)
```

Проверки и форматирование — Biome:

```bash
npm run lint    # линт
npm run format  # форматирование
npm run check   # линт + форматирование
```

В dev-режиме Vite поднимает мок-API.

# Компоненты

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
Тумблеры авторегистрации.

## AuthIco.jsx + AuthAdInfo.jsx
Индикация данных AD-сессии в интерфейсе.

## LkMeet.jsx
Видеовстреча через [LiveKit](https://github.com/OpenVidu/openvidu-local-deployment)

![component_LkMeet.png](img/component_LkMeet.png)

## LkToken.jsx
Форма запроса токена LiveKit (`POST uriLkToken`).

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
