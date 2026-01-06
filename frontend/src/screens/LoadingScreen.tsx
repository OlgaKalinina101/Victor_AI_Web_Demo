import { useEffect, useMemo, useState } from "react";

function timeGreeting(now = new Date()): string {
  const h = now.getHours();
  if (h >= 5 && h <= 11) return "Доброе утро";
  if (h >= 12 && h <= 17) return "Хорошего дня";
  if (h >= 18 && h <= 22) return "Теплого вечера";
  return "Иди спать";
}

function buildGreeting(accountId: string): string {
  return `"${accountId}". Я здесь. ${timeGreeting()}.`;
}

function useTypewriter(text: string, speedMs = 26) {
  const [out, setOut] = useState("");
  useEffect(() => {
    let i = 0;
    setOut("");
    if (!text) return;

    const id = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speedMs);

    return () => window.clearInterval(id);
  }, [text, speedMs]);

  return out;
}

export function LoadingScreen(props: { accountId: string; onDone: () => void }) {
  const greeting = useMemo(() => buildGreeting(props.accountId), [props.accountId]);
  const typed = useTypewriter(greeting, 72);

  useEffect(() => {
    if (typed.length < greeting.length) return;
    const id = window.setTimeout(() => props.onDone(), 3000);
    return () => window.clearTimeout(id);
  }, [greeting.length, props, typed.length]);

  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-card">
        <div className="loading-title">Victor AI</div>
        <div className="loading-text">{typed}</div>
      </div>
    </div>
  );
}


