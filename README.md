# sipjs-react
WebRTC телефон на базе библиотеки [sipjs](https://sipjs.com/)

![phone](img/phone.png)

Готовая сборка в [phone/dist](phone/dist)

```bash
cd phone
npm install
# npm run dev
npm run build
```



# Компоненты

## PhoneReg.jsx
![component_PhoneReg.png](img/component_PhoneReg.png)

## PhonePad.jsx
![component_PhonePad.png](img/component_PhonePad.png)

## PhoneHistory.jsx
![component_PhoneHistory.png](img/component_PhoneHistory.png)

## PhoneIco.jsx
![component_PhoneIco.png](img/component_PhoneIco.png)

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
  "ad_department" : "Отдел",
}
```

![component_AuthAd.png](img/component_AuthAd.png)

## LkMeet.jsx
Видео встреча через [LiveKit](https://github.com/OpenVidu/openvidu-local-deployment)

![component_LkMeet.png](img/component_LkMeet.png)

## PhoneDir.jsx
GET-запрос к серверу справочнику, ожидаемый ответ:
```json
[
  { "label": "Москва префикс", "prefix": "1999" },
  { "label": "Спб префикс", "prefix": "1923" },
  { "label": "Пользователь с длинным именем каким-то", "num": "9991", "email": "user@example.com" },
  { "label": "Пользователь без почты", "num": "9992" },
]
```

![component_PhoneDir.png](img/component_PhoneDir.png)



# Пакеты
Использую Node.js + Vite, см. [tools](tools)

node модули
```bash
npm install --save react react-dom react-router-dom
npm install --save react-redux redux redux-logger redux-thunk
npm install --save @mui/material @emotion/react @emotion/styled @mui/icons-material
npm install --save sip.js date-fns ky
npm install --save-dev vite @vitejs/plugin-react body-parser

# Перепрыгнуть за мажорные версии
npx npm-check-updates
```

npm скрипты
```json
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "serve": "vite preview --host 0.0.0.0"
  }
```
