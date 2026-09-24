---
name: ui-verify
description: Проверить UI-правку sipjs-react в headless Linux-Chromium через .dsh/bin/browser (Playwright CLI) — снапшот, клик, консоль, скриншот. Использовать для рантайм-поведения, вёрстки, стилей от каскада/брейкпоинтов и связки с Redux; не для декларативных правок.
whenToUse: Утверждение о поведении или виде телефона нельзя доказать диффом, lint или сборкой.
---

# Проверка UI-правки в браузере

Сформулировать одно проверяемое утверждение заранее (например, «красный тумблер `AuthPad` при
`regState === "fail"`»). Браузер хостовой Windows не используется агентом — только headless
Linux-Chromium через обёртку; человеку показывать `win_open_url`.

## Когда браузер не нужен

| Уровень | Чем | Что доказывает |
|---|---|---|
| 1 | чтение кода и `git diff` | правка на месте, лишнее не задето |
| 2 | `npm run lint`, `npm run build` | формат, импорты, синтаксис, сборка |
| 3 | `grep`, `node`-скрипт, `curl` к mock-роуту | чистая функция, формат данных, ответ сервиса |
| 4 | этот навык | рантайм, вёрстка/каскад/брейкпоинты, консоль и сеть |

Уровни 1–3 — до браузера, не после. Декларативную правку (тексты, пропсы, разметка без каскада)
браузером не проверять. Если утверждение осталось непроверенным — честно писать, каким уровнем
проверено и что осталось за скобками.

## Окружение

Браузер запускать только обёрткой `.dsh/bin/browser` (уводит `HOME`/`XDG_CACHE_HOME` в
`.playwright/cache` — иначе песочница не даёт Chrome создать профиль); `playwright-cli` напрямую
не звать. Настройки — `.playwright/cli.config.json` (chromium, 1280×800, вывод в
`.playwright/cache/output/`), браузеры — в общем `~/.cache/ms-playwright` (только чтение). Режим
только headless: `--headed` падает без X-сервера.

`open`/`snapshot`/`screenshot`/`console` копят авто-именованные файлы (`page-*.yml|png`,
`console-*.log`) в `.playwright/cache/output/` и не чистят их сами — убирать в шаге 5. Два
параллельных прогона в проекте — разными `PLAYWRIGHT_CLI_SESSION`.

Если не хватает библиотек Chromium (`error while loading shared libraries`):
`sudo apt-get install -y libnss3 libnspr4 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libxrender1 libasound2t64`
(без `sudo` — распаковать `.deb` в `.playwright/cache/deps/`, обёртка сама выставит
`LD_LIBRARY_PATH`). Если браузера нет:
`npm i -g @playwright/cli@latest && playwright-cli install-browser chrome-for-testing`.

## Шаги

1. Поднять dev-сервер (managed background job) и дождаться `curl -sf -o /dev/null
   http://localhost:<порт>/`. Если порт уже отвечает этим проектом — свой не поднимать (HMR
   подхватит правку). Vite молча берёт следующий свободный порт при занятом 3000 — брать
   фактический URL из вывода `npm run dev`, не «свой» адрес по умолчанию.
2. `win_open_url` на фактический URL — только если результат нужен человеку в браузере.
3. **Весь сценарий проверки — одной командой в одном вызове `bash`.** Демон CLI не переживает
   границу вызова (`Browser 'default' is not open` в следующем вызове):

   ```bash
   .dsh/bin/browser open http://localhost:<порт>
   .dsh/bin/browser click e21
   .dsh/bin/browser console warning
   .dsh/bin/browser screenshot --filename=.playwright/cache/output/ui-check-<тема>.png
   .dsh/bin/browser close
   ```

   Для кликов брать `ref` из свежего снапшота — он меняется после каждого клика.
4. Экономить контекст: `snapshot --depth=4` вместо целого дерева, `find` — только по текстовым
   узлам (accessible name, например подпись кнопки, ищет `eval`), `console error`/`requests`
   вместо всего лога, `eval` с `getComputedStyle` вместо скриншота для computed-стилей.
5. Грабли этого проекта:
   - На старте открыт модальный `PhoneReg`, а меню `MenuAppBar` — модальный `Drawer`: пока любой
     из них открыт, остальное приложение в `aria-hidden` и не видно `snapshot`/`find`/роль-локаторам
     — закрывать первым (`Escape` у модалок закрывает верхнюю: на старте это `PhoneReg`, drawer —
     клик по `.MuiDrawer-root .MuiIconButton-root`).
   - `phoneControlRdcr.regState` (`off`/`ok`/`fail`) — единственный флаг регистрации; тумблер
     `AuthPad` трёхпозиционный (`ok` зелёный, `fail` красный). Без настоящего SBC `regState: "ok"`
     даёт только заглушка SIP-over-WebSocket (одноразовый WS-сервер в
     `.playwright/cache/tmpcheck/`, `uriWebRtc` → `ws://127.0.0.1:5080`): нужно эхо
     `Sec-WebSocket-Protocol: sip` в рукопожатии, эхо `Contact` из REGISTER в 200 OK и парный
     `\r\n` на keep-alive — без любого из трёх sip.js рвёт соединение или дропает ответ. Тот же
     200 OK годится для MESSAGE (приглашение получит `delivered`). Удалять заглушку с остальными
     временными файлами прогона.
   - `LkMeet`: своя комната и приглашение требуют `regState === "ok"` (номер — `callerUserNum`),
     не AD. Ссылки, грабли (`.lk-control-bar` не доказывает подключение, комната `9994` занята
     браузером разработчика) и готовый токен — `docs/LIVEKIT.md`.
   - Чат (`PhoneChat`) проверяется без регистрации: подсадить запись в `localstorage-set
     sipMessages '<json>'` (поля `peer`/`body`/`direction`/`time`, у исходящего ещё `status`).
     Ссылка-приглашение открывается в новой вкладке только из исходящего сообщения
     (`target="_blank"`); Enter отправляет, `Shift+Enter`/`Ctrl+Enter` — перенос строки.
   - Адреса сервисов — в `localStorage` (`constants/storage.js`): подставлять через
     `localstorage-set`, дефолты вернуть удалением ключа и перезагрузкой (стор читает
     `localStorage` только на старте, смена `#hash` его не перечитывает).
   - dev-сборка пишет `redux-logger` — namespace-инвариант (`AUTHCTL_` не диспатчит `PHONECTL_`)
     проверять по порядку dispatch в консоли.
   - Регистрация, звонки, медиа и LiveKit-конференция требуют живого сервера и разрешений
     камеры/микрофона; мок их не даёт — если сервера нет, писать прямо, что не проверялось.
6. Отчёт: URL, шаги, наблюдение, ошибки консоли/сети, каким уровнем проверено. Скриншот смотреть
   через `read_image`, не заявлять о визуальном осмотре без него.
7. Убрать за собой: `.dsh/bin/browser close`, остановить только свой dev-job, удалить
   авто-имена текущего прогона (`page-*`, `console-*`) из `.playwright/cache/output/` — обёртка
   чистит лишь то, что старше суток; именованный скриншот (шаг 3) можно оставить.

## Как не тратить вызовы

- Сценарий — один файл на задачу (`.playwright/cache/tmpcheck/<тема>.js`), править его же между
  прогонами, удалить после.
- Логин переиспользовать: `.dsh/bin/browser state-save`/`state-load` или прямой
  `localstorage-set` вместо формы в каждом прогоне.
- Проверять один раз в конце серии правок, не после каждой. A/B «до/после» — только когда причина
  под вопросом.
- Не перепроверять браузером то, что уже доказано уровнями 1–3.

## Признаки проблемы

- ошибки в `console error` (включая React warnings о ключах и PropTypes);
- 4xx/5xx в `requests` — сверить с `mock/vite-mock-api.js`;
- снапшот не содержит ожидаемого элемента, хотя он виден на скриншоте — открыт модал/drawer
  (`aria-hidden`), закрыть `Escape`;
- `Browser 'default' is not open` — шаги разнесены по разным вызовам `bash`;
- сервер поднялся, но страница пустая — проверить, что dev-job жив, а не упал.
