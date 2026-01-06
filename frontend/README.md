## Victor AI — web demo (React)

### Запуск

```bash
cd frontend
npm install
npm run dev
```

### Настройки

- **`VITE_API_BASE`**: базовый URL API.
  - если не задан, в dev берём `http://127.0.0.1:8000`
  - если UI открыт на `victor-web-*.ngrok-free.dev`, по умолчанию берём `https://victor-api-*.ngrok-free.dev`
  - если открыт `*.ngrok-free.dev` — берём текущий `window.location.origin`
- **`VITE_ACCOUNT_ID`**: не используется (логин теперь через `/auth/resolve`, а `account_id` вводится только при регистрации)
- **`VITE_ENERGY_MAX`**: “100% энергии” для HUD (нормализация `account_balance - spent` из `/assistant/usage`). Если не задан — берём `account_balance` текущего провайдера.
- **`VITE_TOKEN_PRICE_PER`**: единица цены токенов, то есть “цена за N токенов” (по умолчанию `1`). Используется для расчёта `spent`: `(tokens_used / N) * token_price`.

Пример `.env.local`:

```bash
VITE_API_BASE=https://victor-api-olga.ngrok-free.dev
VITE_ACCOUNT_ID=1
VITE_TOKEN_PRICE_PER=1
```

### Быстро переключить API без пересборки (ngrok)

Можно открыть UI так:
- `https://victor-web-olga.ngrok-free.dev/?api=https://victor-api-olga.ngrok-free.dev`



