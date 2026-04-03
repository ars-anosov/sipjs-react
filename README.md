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

## PhoneControlIco.jsx
![component_PhoneControlIco.png](img/component_PhoneControlIco.png)



# Пакеты
Использую Node.js + Vite, см. [tools](tools)

```bash
npm install --save react react-dom
npm install --save react-redux redux redux-logger redux-thunk
npm install --save @mui/material @emotion/react @emotion/styled @mui/icons-material
npm install --save sip.js date-fns
npm install --save-dev vite @vitejs/plugin-react

# Перепрыгнуть за мажорные версии
npx npm-check-updates
```
