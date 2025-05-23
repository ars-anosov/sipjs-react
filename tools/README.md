# tools
Инструменты для сборки SPA

# Node.js + Vite
[nodejs.org](https://nodejs.org/en/download), [fnm](https://github.com/Schniz/fnm)

```powershell
winget install Schniz.fnm

fnm list
fnm install 22
fnm use 22

# https://github.com/Schniz/fnm#shell-setup
if (-not (Test-Path $profile)) { New-Item $profile -Force }
Invoke-Item $profile
# --- вставить
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
# --- вставить

node -v
# v22.15.0
```



[vite.dev](https://vite.dev/guide/)

```powershell
npm create vite@latest vite-react-app -- --template react

cd vite-react-app
npm install
npm run dev
```



# Material UI
Проверяем собираемость компонент от Google's Material Design.

[mui.com](https://mui.com/material-ui/getting-started/example-projects/), [material-ui-vite](https://github.com/mui/material-ui/tree/master/examples/material-ui-vite)

```powershell
# 200+ MB
curl https://codeload.github.com/mui/material-ui/tar.gz/master --output material-ui-master.tar.gz
tar -f material-ui-master.tar.gz -xz --strip=2 material-ui-master/examples/material-ui-vite

cd material-ui-vite
npm install
npm run dev
```
