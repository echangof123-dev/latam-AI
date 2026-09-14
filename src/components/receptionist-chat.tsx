"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CLIENT_VOICE } from "@/lib/brand";
import { useVoiceCapture } from "./voice-capture";

type Biz = { name: string; phone: string; clientName?: string };
type Msg = { role: "user" | "ai"; text: string };

export function ReceptionistChat({ businesses }: { businesses: Biz[] }) {
  const [to, setTo] = useState(businesses[0]?.phone || "");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [fromPhone] = useState(() => {
    if (typeof window === "undefined") return "+573100000001";
    const key = "ejeuno_web_phone";
    const saved = localStorage.getItem(key);
    if (saved) return saved;
    const n = `+5731${Math.floor(10000000 + Math.random() * 89999999)}`;
    localStorage.setItem(key, n);
    return n;
  });
  const box = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceReply = useRef(false);

  const current = useMemo(() => businesses.find((b) => b.phone === to) || businesses[0], [businesses, to]);
  const agent = current?.clientName || "Sofía";
  const bizName = current?.name || "el negocio";
  const initial = agent.slice(0, 1).toUpperCase();

  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: `Hola, soy ${agent}, de ${bizName}. ¿En qué le ayudo?` },
  ]);

  useEffect(() => {
    setMsgs([{ role: "ai", text: `Hola, soy ${agent}, de ${bizName}. ¿En qué le ayudo?` }]);
  }, [to, agent, bizName]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  async function speakHuman(phrase: string) {
    audioRef.current?.pause();
    try {
      const res = await fetch("/api/channels/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: phrase, voice: CLIENT_VOICE }),
      });
      const data = await res.json().catch(() => null);
      if (data?.audio) {
        const audio = new Audio(data.audio);
        audio.setAttribute("playsinline", "true");
        audioRef.current = audio;
        audio.onplay = () => setSpeaking(true);
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        await audio.play();
        return;
      }
    } catch {
      /* texto en pantalla */
    }
    setSpeaking(false);
  }

  const send = useCallback(
    async (raw: string, heard = false) => {
      const clean = raw.trim();
      if (!clean || busy) return;
      if (!to) {
        setMsgs((m) => [...m, { role: "ai", text: "Elige un negocio arriba y vuelve a enviar." }]);
        return;
      }
      setBusy(true);
      setMsgs((m) => [...m, { role: "user", text: clean }]);
      setText("");
      try {
        const res = await fetch("/api/channels/inbound", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to,
            from: fromPhone,
            text: clean,
            channel: "WEB",
            wantAudio: false,
          }),
        });
        const data = await res.json().catch(() => null);
        const reply =
          data?.reply ||
          `Soy ${agent}. Ahora mismo no pude completar la respuesta. ¿Lo intentamos otra vez?`;
        setMsgs((m) => [...m, { role: "ai", text: reply }]);
        setBusy(false);
        if (data?.reply && heard) void speakHuman(reply);
        return;
      } catch {
        setMsgs((m) => [...m, { role: "ai", text: "Hay un problema de conexión. Intenta otra vez." }]);
      } finally {
        setBusy(false);
      }
    },
    [agent, busy, fromPhone, to],
  );

  const onVoice = useCallback(
    (said: string) => {
      if (!said.trim()) {
        setMsgs((m) => [
          ...m,
          {
            role: "ai",
            text: "No alcancé a oír. En el celular pulsa Hablar, suelta y espera; o escribe aquí.",
          },
        ]);
        return;
      }
      voiceReply.current = true;
      void send(said, true);
    },
    [send],
  );

  const { listening, toggle } = useVoiceCapture(onVoice);

  const status = speaking
    ? "Hablando…"
    : busy
      ? "Pensando…"
      : listening
        ? "Te escucho… suelta para enviar"
        : "En línea";

  return (
    <div className="card overflow-hidden p-0 flex flex-col h-full min-h-0 sm:h-[min(34rem,calc(100dvh-8rem))]">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex items-center gap-3 shrink-0">
        <span className={`agent-face agent-face-client ${speaking ? "ring-2 ring-rose-300/60" : ""}`}>{initial}</span>
        <div className="min-w-0">
          <p className="text-base sm:text-lg font-semibold leading-tight truncate">{agent}</p>
          <p className="text-xs sm:text-sm text-slate-400 truncate">{bizName} · recepción</p>
          <p className="text-xs text-emerald-400 mt-0.5">{status}</p>
        </div>
      </div>

      {businesses.length > 1 ? (
        <div className="px-4 sm:px-6 pt-3 shrink-0">
          <label className="block mb-1">Negocio</label>
          <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full">
            {businesses.map((b) => (
              <option key={b.phone} value={b.phone}>
                {b.clientName ? `${b.clientName} · ${b.name}` : b.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div ref={box} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-3 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <p className={m.role === "user" ? "chat-user" : "chat-agent"}>{m.text}</p>
          </div>
        ))}
      </div>

      <form
        className="border-t border-white/10 p-3 sm:p-4 flex gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          voiceReply.current = false;
          void send(text, false);
        }}
      >
        <button
          type="button"
          onClick={() => void toggle()}
          className={`rounded-xl px-3 sm:px-4 font-semibold shrink-0 ${listening ? "bg-red-500 text-white" : "btn-ghost"}`}
        >
          {listening ? "Parar" : "Hablar"}
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Escríbele a ${agent}…`}
          className="flex-1 min-w-0"
          disabled={busy}
          inputMode="text"
          autoComplete="off"
        />
        <button type="submit" className="btn-gold shrink-0" disabled={busy}>
          {busy ? "…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}
