"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CLIENT_VOICE } from "@/lib/brand";
import { useVoiceCapture } from "./voice-capture";
import { AiBody, IconMic, IconSend, IconStop, Sparkle, ThinkingRow } from "./ai-mark";

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

  const current = useMemo(() => businesses.find((b) => b.phone === to) || businesses[0], [businesses, to]);
  const agent = current?.clientName || "Sofía";
  const bizName = (current?.name || "el negocio").trim();

  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: `Hola, soy ${agent}, de ${bizName}. ¿En qué te ayudo hoy?` },
  ]);

  useEffect(() => {
    setMsgs([{ role: "ai", text: `Hola, soy ${agent}, de ${bizName}. ¿En qué te ayudo hoy?` }]);
  }, [to, agent, bizName]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

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
      /* texto */
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
          body: JSON.stringify({ to, from: fromPhone, text: clean, channel: "WEB", wantAudio: false }),
        });
        const data = await res.json().catch(() => null);
        const reply =
          data?.reply || `Soy ${agent}. Ahora mismo no pude completar la respuesta. ¿Lo intentamos otra vez?`;
        setMsgs((m) => [...m, { role: "ai", text: reply }]);
        if (data?.reply && heard) void speakHuman(reply);
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
          { role: "ai", text: "No alcancé a oír. Pulsa el micrófono, habla y vuelve a pulsarlo; o escribe." },
        ]);
        return;
      }
      void send(said, true);
    },
    [send],
  );

  const { listening, toggle } = useVoiceCapture(onVoice);
  const fresh = msgs.length === 1 && msgs[0].role === "ai";

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 flex justify-center px-4 pt-2">
        {businesses.length > 1 ? (
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-auto max-w-full rounded-full border-[#dadce0] bg-white py-1.5 pl-4 pr-8 text-sm shadow-sm"
            aria-label="Negocio"
          >
            {businesses.map((b) => (
              <option key={b.phone} value={b.phone}>
                {b.clientName ? `${b.clientName} · ${b.name}` : b.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-[#5f6368]">
            {agent} · {bizName}
          </p>
        )}
      </div>

      <div ref={box} className="flex-1 min-h-0 overflow-y-auto">
        {fresh ? (
          <div className="h-full grid place-items-center px-6 text-center">
            <div>
              <div className="flex justify-center mb-5">
                <Sparkle size={48} pulse={speaking || busy} />
              </div>
              <h1 className="text-[2rem] sm:text-5xl font-normal tracking-tight text-[#1f1f1f]">Hola, soy {agent}</h1>
              <p className="mt-3 text-[#5f6368] text-base sm:text-lg">¿En qué te ayudo hoy en {bizName}?</p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <p className="chat-user">{m.text}</p>
                </div>
              ) : (
                <div key={i} className="flex gap-3 items-start">
                  <span className="mt-1 shrink-0">
                    <Sparkle size={20} />
                  </span>
                  <AiBody text={m.text} />
                </div>
              ),
            )}
            {busy ? <ThinkingRow label="Pensando" /> : null}
            {speaking && !busy ? <ThinkingRow label="Hablando" /> : null}
          </div>
        )}
      </div>

      <form
        className="shrink-0 px-3 sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 max-w-3xl mx-auto w-full"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text, false);
        }}
      >
        {listening ? <p className="text-center text-sm text-[#d93025] mb-2">Te escucho… pulsa otra vez para enviar</p> : null}
        <div className="composer">
          <button
            type="button"
            onClick={() => void toggle()}
            className={listening ? "icon-btn icon-btn-on" : "icon-btn"}
            aria-label={listening ? "Parar" : "Hablar"}
          >
            {listening ? <IconStop /> : <IconMic />}
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Pregúntale a ${agent}`}
            className="flex-1 min-w-0"
            disabled={busy}
            inputMode="text"
            autoComplete="off"
          />
          <button type="submit" className="send-btn" disabled={busy || !text.trim()} aria-label="Enviar">
            <IconSend />
          </button>
        </div>
        <p className="text-center text-[11px] text-[#80868b] mt-2">Eje Uno puede equivocarse. Confirma citas y precios en el negocio.</p>
      </form>
    </div>
  );
}
