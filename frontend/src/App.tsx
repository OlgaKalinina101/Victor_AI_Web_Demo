import { useMemo, useState } from "react";
import { ChatScreen } from "./screens/ChatScreen";
import { LoadingScreen } from "./screens/LoadingScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { loadAuth } from "./lib/storage";

export default function App() {
  const auth = useMemo(() => loadAuth(), []);
  const hasStoredAuth = Boolean(auth.accessToken && auth.accountId);
  const [phase, setPhase] = useState<"login" | "loading" | "chat">(
    hasStoredAuth ? "chat" : "login"
  );
  const [loadingAccountId, setLoadingAccountId] = useState<string>(auth.accountId || "");

  if (phase === "login") {
    return (
      <LoginScreen
        onAuthed={() => {
          const next = loadAuth();
          setLoadingAccountId(next.accountId || "");
          setPhase("loading");
        }}
      />
    );
  }

  if (phase === "loading") {
    return <LoadingScreen accountId={loadingAccountId || "user"} onDone={() => setPhase("chat")} />;
  }

  return (
    <ChatScreen
      onLogout={() => {
        setPhase("login");
      }}
    />
  );
}


