"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";


// ⚠️ IMPORTA QUI il tuo componente ChatKit REALE
// Se nel tuo progetto prima avevi: import { ChatKit } from "@openai/chatkit-react";
// rimetti quello. Io lascio un placeholder "ChatKitUI" da adattare.
// ---
// ESEMPIO (probabile):
// import { ChatKit } from "@openai/chatkit-react";
// import { createChatKitControl } from "@openai/chatkit-react";
// ---
// Se invece usi un <chatkit-ui /> web component, lo gestiamo uguale.

type SendUserMessageFn = (args: { text?: string; newThread?: boolean }) => Promise<void>;

export type CustomChatPanelHandle = {
  startNewThread: (text: string) => void;
  send: (text: string) => void;
};

declare global {
  interface Window {
    // lo script chatkit.js aggiunge roba globale; non tipizziamo troppo
    chatkit?: unknown;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForChatKitScript(timeoutMs = 8000) {
  const start = Date.now();
  // aspetta che lo script sia caricato (non sempre espone window.chatkit, dipende dalla build)
  // quindi controlliamo anche la presenza del tag script come fallback.
  while (Date.now() - start < timeoutMs) {
    const hasScript = Boolean(
      document.querySelector('script[src*="cdn.platform.openai.com/deployments/chatkit/chatkit.js"]')
    );
    if (hasScript) return true;
    await sleep(50);
  }
  return false;
}

export default forwardRef<CustomChatPanelHandle, {}>(function CustomChatPanel(_props, ref) {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  // Qui dentro metti la tua “sendUserMessage” reale quando la chat è pronta.
  const sendUserMessageRef = useRef<SendUserMessageFn | null>(null);

  // Coda di messaggi finché la chat non è pronta
  const queueRef = useRef<Array<{ text: string; newThread?: boolean }>>([]);

  // Espongo API al parent (page.tsx)
  useImperativeHandle(ref, () => ({
    startNewThread: (text: string) => {
      // metto in coda e poi provo flush
      queueRef.current.push({ text, newThread: true });
      flushQueue();
    },
    send: (text: string) => {
      queueRef.current.push({ text, newThread: false });
      flushQueue();
    },
  }));

  async function flushQueue() {
    const send = sendUserMessageRef.current;
    if (!send) return; // non pronta

    // svuota in ordine
    while (queueRef.current.length) {
      const msg = queueRef.current.shift()!;
      try {
        await send({ text: msg.text, newThread: msg.newThread });
      } catch (e) {
        console.error(e);
        // se fallisce, rimetto il messaggio in testa e stop
        queueRef.current.unshift(msg);
        break;
      }
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setBootError(null);

      const ok = await waitForChatKitScript();
      if (!ok) {
        if (!cancelled) setBootError("ChatKit non caricato (script mancante o bloccato).");
        return;
      }

      // 👇 QUI è il punto in cui agganci la tua implementazione reale.
      // Hai 2 casi possibili:

      // CASO A) stai usando un hook/SDK che ti dà sendUserMessage:
      // - allora in questo file devi creare/inizializzare quel control/provider
      // - e assegnare sendUserMessageRef.current = sendUserMessage

      // CASO B) stai usando il web component <chatkit-ui> che gestisce lui input ecc.
      // - allora la “ready” è semplicemente quando l’elemento esiste.

      // Siccome tu prima avevi errori su sendUserMessage(...) e ref.current[key],
      // significa che NON era agganciato. Quindi facciamo un bootstrap minimale:
      // ✅ renderizziamo il web component direttamente, e “ready” quando montato.
      // (È la strada più stabile e meno fragile.)

      if (cancelled) return;
      setReady(true);

      // Se hai una sendUserMessage reale, impostala qui e fai flush:
      // sendUserMessageRef.current = async ({ text, newThread }) => { ... };
      // flushQueue();
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  // UI
  const status = useMemo(() => {
    if (bootError) return { kind: "error" as const, text: bootError };
    if (!ready) return { kind: "loading" as const, text: "Chat non pronta: riprova tra un secondo." };
    return { kind: "ok" as const, text: null };
  }, [bootError, ready]);

  return (
    <div className="h-full w-full rounded-xl border border-purple-200 bg-white">
      {status.kind !== "ok" && (
        <div
          className={
            status.kind === "error"
              ? "m-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              : "m-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          }
        >
          {status.text}
        </div>
      )}

      {/* ✅ Qui metti il renderer reale di chat */}
      {/* Se usi web component ChatKit: */}
      {ready && (
        <div className="h-[calc(100%-0px)] w-full">
          {/* se il tuo progetto usa il web component, questo renderizza input + messaggi */}
          {React.createElement("chatkit-ui", {
  style: { height: "100%", width: "100%", display: "block" },
})}
        </div>
      )}
    </div>
  );
});