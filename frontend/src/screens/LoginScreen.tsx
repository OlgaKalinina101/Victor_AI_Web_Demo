import { useMemo, useState } from "react";
import { webDemoRegister, webDemoResolve } from "../lib/api";
import { loadAuth, saveAuth } from "../lib/storage";
import type { WebDemoResolveResponse } from "../lib/types";

type GenderUi = "" | "MALE" | "FEMALE";
type Step = "demo_key" | "registration";

function mapGender(ui: Exclude<GenderUi, "">): "мужчина" | "девушка" {
  return ui === "MALE" ? "мужчина" : "девушка";
}

function validateAccountId(raw: string): { ok: true; normalized: string } | { ok: false; error: string } {
  const v = raw.trim();
  if (!v) return { ok: false, error: "Введите account_id" };
  if (/[\r\n\s]/.test(v)) return { ok: false, error: "account_id без пробелов и переносов строк" };
  if (v !== v.toLowerCase()) return { ok: false, error: "account_id должен быть lower()" };
  if (!/^[a-z0-9_]+$/.test(v)) return { ok: false, error: "account_id: только латиница a-z, цифры и _" };
  return { ok: true, normalized: v };
}

export function LoginScreen(props: { onAuthed?: () => void }) {
  const existingAuth = useMemo(() => loadAuth(), []);

  const [step, setStep] = useState<Step>("demo_key");
  const [demoKey, setDemoKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [gender, setGender] = useState<GenderUi>("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [resolveInfo, setResolveInfo] = useState<WebDemoResolveResponse | null>(null);

  const okText = useMemo(() => {
    if (existingAuth.accessToken) return "Токен уже сохранён (localStorage)";
    return null;
  }, [existingAuth.accessToken]);

  async function onSubmitDemoKey() {
    const trimmed = demoKey.trim();
    if (!trimmed) {
      setErrorText("Введите demo key / код доступа");
      return;
    }

    setIsLoading(true);
    setErrorText(null);
    setResolveInfo(null);

    try {
      const resolved = await webDemoResolve({ demoKey: trimmed });
      setResolveInfo(resolved);

      if (resolved.status === "needs_registration") {
        setStep("registration");
      } else {
        saveAuth(resolved.access_token, resolved.account_id, resolved.initial_state);
        props.onAuthed?.();
      }
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : "Ошибка авторизации");
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmitRegistration() {
    const key = demoKey.trim();
    if (!key) {
      setErrorText("Введите demo key / код доступа");
      setStep("demo_key");
      return;
    }

    const v = validateAccountId(accountId);
    if (!v.ok) {
      setErrorText(v.error);
      return;
    }
    if (!gender) {
      setErrorText("Выберите Gender");
      return;
    }

    setIsLoading(true);
    setErrorText(null);

    try {
      const res = await webDemoRegister({
        demoKey: key,
        accountId: v.normalized,
        gender: mapGender(gender)
      });
      saveAuth(res.access_token, res.account_id, res.initial_state);
      props.onAuthed?.();
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : "Ошибка регистрации");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="screen">
      <div className="mock-card" role="region" aria-label="Victor AI Login">
        <h1 className="mock-title">Victor AI</h1>

        <div className="mock-spacer" />

        <h2 className="mock-subtitle">Вход в демо-доступ</h2>

        <div className="mock-spacer" />

        <div>
          <div className="mock-label">
            {step === "registration" ? "account_id и Gender:" : "Demo key / код доступа:"}
          </div>
          <div className="mock-inputShell">
            <div className="mock-fieldSwap">
              <div className={["mock-fieldPanel", step === "demo_key" ? "is-active" : ""].join(" ")}>
                <input
                  className="mock-input"
                  type="password"
                  autoComplete="current-password"
                  placeholder="•••••••••••••••••••••••"
                  value={demoKey}
                  onChange={(e) => setDemoKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSubmitDemoKey();
                  }}
                  disabled={isLoading || step !== "demo_key"}
                  aria-label="Demo key"
                />
              </div>

              <div
                className={[
                  "mock-fieldPanel",
                  "mock-fieldPanelRow",
                  step === "registration" ? "is-active" : ""
                ].join(" ")}
              >
                <input
                  className="mock-input"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="account_id"
                  value={accountId}
                  onChange={(e) => {
                    const next = e.target.value.replace(/[\r\n]/g, "").toLowerCase();
                    setAccountId(next);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSubmitRegistration();
                  }}
                  disabled={isLoading || step !== "registration"}
                  aria-label="account_id"
                />
                <div className="mock-divider" aria-hidden="true" />
                <select
                  className="mock-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as GenderUi)}
                  disabled={isLoading || step !== "registration"}
                  aria-label="Gender"
                >
                  <option value="">Gender</option>
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mock-actions">
          {step === "registration" ? (
            <button className="mock-button" onClick={onSubmitRegistration} disabled={isLoading}>
              {isLoading ? "..." : "ВОЙТИ"}
            </button>
          ) : (
            <button className="mock-button" onClick={onSubmitDemoKey} disabled={isLoading}>
              {isLoading ? "..." : "ВОЙТИ"}
            </button>
          )}
        </div>

        <div
          className={[
            "mock-status",
            errorText ? "mock-statusError" : "",
            okText ? "mock-statusOk" : ""
          ].join(" ")}
          aria-live="polite"
        >
          {errorText ||
            (step === "registration" && resolveInfo?.status === "needs_registration"
              ? resolveInfo.message
              : okText) ||
            ""}
        </div>

        {step !== "registration" ? (
          <div className="mock-hint">подсказка: ключ выдаёт автор проекта</div>
        ) : null}

        {/* greeting moved to LoadingScreen */}
      </div>
    </div>
  );
}


