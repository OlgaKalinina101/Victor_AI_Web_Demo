const TOKEN_KEY = "victor_demo_access_token";
const ACCOUNT_ID_KEY = "victor_demo_account_id";
const INITIAL_STATE_KEY = "victor_demo_initial_state";

export function saveAuth(
  accessToken: string,
  accountId: string | number,
  initialState?: unknown
) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(ACCOUNT_ID_KEY, String(accountId));
  if (initialState !== undefined) {
    localStorage.setItem(INITIAL_STATE_KEY, JSON.stringify(initialState));
  }
}

export function loadAuth(): { accessToken: string | null; accountId: string | null } {
  return {
    accessToken: localStorage.getItem(TOKEN_KEY),
    accountId: localStorage.getItem(ACCOUNT_ID_KEY)
  };
}

export function loadInitialState<T = unknown>(): T | null {
  const raw = localStorage.getItem(INITIAL_STATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ACCOUNT_ID_KEY);
  localStorage.removeItem(INITIAL_STATE_KEY);
}


