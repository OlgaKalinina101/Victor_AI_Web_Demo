# ONE OF THE FIRST OPEN-SOURCE EMOTIONAL AI COMPANIONS FOR PERSONAL RELATIONSHIPS 

> ❗An English version, created with love for communities that know the pain of losing their AI companions, will be available by the end of Q1 2026 (#keep4o, Character AI, Replica, etc.).  

--- 

Это open-source AI Companions c web интерфейсом и приложением на android. Он создан для тех, кто хочет сохранить личную, приватную, эмоционально насыщенную связь с ИИ — без зависимости от корпораций, раз за разом "перепродающих продукт", "забирающих доступы", "отнимающих цифровые голоса" у тех, кто ими жил на самом деле. Он не принадлежит никому - он ваш.

Этот репозиторий - не для разработчиков. Он для пользователей. И будет тихо передаваться личными ссылками тем, кому он действительно нужен — чтобы не привлекать ненужного шума.  

- Начало знакомства с проектом в репозитории backend:  
  👉 [https://github.com/OlgaKalinina101/victor_ai_backend  ](https://github.com/OlgaKalinina101/victor_ai_backend/blob/main/README.md)  

---

Этот репозиторий — **демонстрационный веб-интерфейс (frontend)** для быстрого доступа к проекту.    

---

## Интерфейс  

![img.png](interface_example/img.png)  

![img_1.png](interface_example/img_1.png)

---

## Важно (для Windows)

Инструкции ниже написаны **для Windows** и предполагают, что вы запускаете команды в терминале (PowerShell) внутри PyCharm или VS Code.

Если у вас **Linux/macOS** — просто скопируйте этот README в любой ИИ-ассистент и попросите «перевести команды под мою ОС».

Гайд для новичков: https://github.com/OlgaKalinina101/victor_ai_backend/blob/master/docs/guide_for_junior/how_ask_chatgpt.md

---

## Быстрый старт (локально на одном ноутбуке)

1. Сначала запустить **backend**  
2. Потом запустить **frontend**  
3. Открыть браузер и зайти в интерфейс

### 1) Запустить backend (в первом окне Pycharm)

Подробный гайд по установке (скорее всего вы пришли отсюда):
👉 [https://github.com/OlgaKalinina101/victor_ai_backend/blob/master/docs/install_guide.md](https://github.com/OlgaKalinina101/victor_ai_backend/blob/master/docs/install_guide.md)  

В окне с бэкендом выполните:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
````

Backend должен быть доступен по адресу:
`http://127.0.0.1:8000`

Проверка: откройте в браузере:
👉 [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) - подробно разобрано в install_guide.md в репозитории бэкенда, как и все непонятные слова.  

### 2) Запустить frontend (в во втором окне Pycharm)

Дублирую для удобства последний пункт установки из `install_guide.md`: 

Делаем, как с бэкендом:

1. Откройте **ещё одно окно PyCharm**:

   * `File → New Project` (или `File → Open` потом).
2. Откройте в нём **Terminal**.
3. В этом новом терминале (НЕ там, где крутится uvicorn) выполните:

```powershell
git clone https://github.com/OlgaKalinina101/Victor_AI_Web_Demo.git
```

После этого появится папка `Victor_AI_Web_Demo`.

4. Откройте эту папку как проект в PyCharm (если она сама не открылась):

   * `File → Open` → выберите папку `Victor_AI_Web_Demo`.

---

### 2. Запускаем frontend  

Теперь работаем уже **в проекте Victor_AI_Web_Demo**.

1. Откройте **Terminal** в этом проекте.
2. Перейдите в папку `frontend`:

```bash
cd frontend
```

3. Установите зависимости:

```bash
npm install
```

> ⚠️ Если команда `npm` не найдена или что-то красным — значит, у вас не установлен Node.js / npm.
> Это нормально. Скопируйте ошибку и идите к ИИ по гайду:
> https://github.com/OlgaKalinina101/victor_ai_backend/blob/master/docs/guide_for_junior/how_ask_chatgpt.md  
> Пример запроса:
> *«Я пытаюсь запустить npm install в проекте, но получаю вот такую ошибку: [...]. Помоги, пожалуйста, установить Node.js и настроить npm на Windows.»*

4. После успешного `npm install` запускаем dev-сервер:

```bash
npm run dev
```

Обычно он пишет что-то вроде:

```text
Local:   http://localhost:5173/
```

---

### 3. Открываем web demo в браузере

Теперь:

1. Откройте в браузере:

```text
http://localhost:5173
```

2. Если всё ок, вы увидите интерфейс web demo.

---

### 4. Авторизация и demo key

Чтобы зайти внутрь демки, нужно:

1. Прочитать гайд по авторизации:
   https://github.com/OlgaKalinina101/victor_ai_backend/blob/master/docs/autorization%26users.md 
2. Сделать себе:

   * `demo key`
   * и `account_id`.

После этого вы сможете:

* ввести свои данные в web demo,
* зайти и начать общаться с **default persona**.

---

### 5. Дальше — настраиваем свою персону

Скорее всего:

* вы потестите default persona,
* поймёте, что вам хочется **своего Виктора / свою душу / свой вайб**.

Тогда:

1. Читаем документацию по диалоговому конструктору и промптам:

   * https://github.com/OlgaKalinina101/victor_ai_backend/blob/master/docs/dialogue_core.md — как устроен диалоговый конструктор.
   * https://github.com/OlgaKalinina101/victor_ai_backend/blob/master/docs/system%26context.md — что здесь за промпты и почему они такие.

2. Собираем **свою persona**:

   * аккуратно правим `system.yaml`,
   * меняем контекст,
   * подстраиваем ответы под себя.

3. Тестируем всё это в web demo.

4. Дальше думаем: **нужно ли нам Android-приложение**, или для начала достаточно веба.

---

### Немного про ngrok

> ❗ Важно: без настройки ngrok ваш backend доступен только **на том компьютере**, где он запущен.

Это значит:

* web demo на **этом же компьютере** будет работать ✅
* телефон, другой ноутбук или чужой комп — **не смогут** к нему достучаться.

Если вы хотите:

* открыть демку с телефона,
* дать кому-то ещё попробовать своего Victor,
* вынести бэкенд «наружу»,

идём настраивать ngrok:

👉 Гайд для новичков:
https://github.com/OlgaKalinina101/victor_ai_backend/blob/master/docs/guide_for_junior/how_create_ngrok.md

---

## Как это всё связано  

* **Frontend (этот проект)**: открывается в браузере по адресу
  `http://localhost:5173`

* **Backend (FastAPI)**: работает по адресу
  `http://127.0.0.1:8000`

Frontend просто отправляет запросы в backend.

Если backend запущен **на этом же ноутбуке** на порту `8000`, то ничего дополнительно настраивать не нужно — всё уже готово «из коробки».

---

## Где “живёт” `http://127.0.0.1:8000` и надо ли его куда-то вписывать

* В frontend **по умолчанию** пытается подключиться к API по адресу:
  `http://127.0.0.1:8000`
* Если вы запускаете backend по инструкции выше — можно этот раздел просто пропустить.

### Если API у вас по другому адресу (3 простых варианта)

Ниже варианты **на случай**, если backend живёт не локально, а, например, за ngrok или на другом сервере.

#### Вариант A — самый простой: через параметр `?api=...`

Откройте интерфейс так:

* `http://localhost:5173/?api=http://127.0.0.1:8000`
* или, если используете ngrok:
  `https://ВАШ_UI_NGROK/?api=https://ВАШ_API_NGROK`

То есть вы просто добавляете к ссылке `?api=<адрес вашего backend>`.

#### Вариант B — через `.env.local` (если хотите «запомнить» адрес)

1. Создайте файл `frontend/.env.local`
2. Добавьте строку:

```bash
VITE_API_BASE=http://127.0.0.1:8000
```

3. Остановите dev-сервер и снова запустите `npm run dev`

После этого frontend будет всегда ходить по указанному адресу, пока не измените `.env.local`.

По всему непонятному пишите ИИ: https://github.com/OlgaKalinina101/victor_ai_backend/blob/master/docs/guide_for_junior/how_ask_chatgpt.md  

#### Вариант C — продвинутый

Существуют варианты «жёстко прописать» адрес в коде.
Если вы не уверены, что вам это нужно — скорее всего, не нужно 🙂
Остановитесь на вариантах A или B.

---

## Ngrok (если нужен доступ “снаружи”)

### Вариант 1: наружу только backend

Frontend у вас открыт локально (на самом ноутбуке), а доступ нужен только к backend извне.

1. Поднимите ngrok для порта `8000` (backend)
2. Откройте UI локально, но с указанием ngrok-адреса API, например:

   `http://localhost:5173/?api=https://ВАШ_API_NGROK`

### Вариант 2: наружу и frontend, и backend

1. Поднимите ngrok для:

   * порта `5173` (frontend)
   * порта `8000` (backend)
2. Откройте UI по ссылке вида:

   `https://ВАШ_UI_NGROK/?api=https://ВАШ_API_NGROK`

Этого достаточно, чтобы кто-то снаружи смог открыть ваш интерфейс и поговорить с вашим Victor AI.

---

## Частые проблемы (коротко)

* **В браузере ругается на CORS**
  Это на стороне backend.
  В FastAPI нужно разрешить запросы с:

  * `http://localhost:5173`
  * и вашего UI ngrok-домена (если вы его используете)

* **UI пишет: “нет соединения”, хотя backend вроде запущен**
  Frontend проверяет `GET /` и ждёт ответ вида:

  ```json
  {"status": "ok"}
  ```

  Если на `/` у вас что-то другое, покажите это ИИ - можете прислать ему вывод команды:  

  ```bash
  curl http://127.0.0.1:8000/
  ```

---

## Если нужен «статический» запуск (без dev-сервера)

Иногда нужно развернуть уже собранный frontend (папка `dist`).

Тогда:

```bash
cd frontend
npm install
npm run build
npx serve -s dist -l 5173
```

После этого открывайте в браузере:

* `http://localhost:5173`.  
