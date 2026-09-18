"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OWNER_VOICE } from "@/lib/brand";
import { useVoiceCapture } from "./voice-capture";
import { IconMic, IconSend, IconStop, Sparkle, ThinkingRow } from "./ai-mark";

type Msg = { role: "user" | "ai"; text: string };

const SUGGESTIONS = [
  "¿Qué citas hay hoy?",
  "¿Quién viene esta semana?",
  "Resumen del negocio",
  "Horario y días cerrados",
  "Ventas y facturas",
  "Busca un cliente",
];

export function OwnerAssistantChat({
  tenantName,
  ownerName,
  agentName,
  clientName,
}: {
  tenantName: string;
  ownerName: string;
  agentName: string;
  clientName: string;
}) {
  const first = ownerName.split(" ")[0] || "tú";
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ai",
      text: `Hola ${first}. Soy ${agentName}, asistente de ${tenantName}. Pregúntame por citas, clientes, horarios o cómo va ${clientName} con el público.`,
    },
  ]);
  const box = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceOnRef = useRef(true);

  useEffect(() => {
    voiceOnRef.current = voiceOn;
    if (!voiceOn) {
      audioRef.current?.pause();
      setSpeaking(false);
    }
  }, [voiceOn]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    void (async () => {
      try {
        const res = await fetch("/api/app/asistente");
        const data = await res.json().catch(() => null);
        if (Array.isArray(data?.messages) && data.messages.length) {
          setMsgs(data.messages as Msg[]);
        }
      } catch {
        /* saludo */
      }
    })();
  }, []);

  async function speakHuman(phrase: string) {
    if (!voiceOnRef.current) return;
    audioRef.current?.pause();
    try {
      const res = await fetch("/api/channels/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: phrase, voice: OWNER_VOICE }),
      });
      const data = await res.json().catch(() => null);
      if (data?.audio && voiceOnRef.current) {
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
      setBusy(true);
      setMsgs((m) => [...m, { role: "user", text: clean }]);
      setText("");
      try {
        const res = await fetch("/api/app/asistente", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean }),
        });
        const data = await res.json().catch(() => null);
        const reply = data?.reply || "No pude leer el CRM. Prueba otra vez.";
        setMsgs((m) => [...m, { role: "ai", text: reply }]);
        if (data?.reply && (heard || voiceOnRef.current)) void speakHuman(reply);
      } catch {
        setMsgs((m) => [...m, { role: "ai", text: "Hay un problema de conexión." }]);
      } finally {
        setBusy(false);
      }
    },
    [busy],
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
      <div className="shrink-0 flex items-center justify-center gap-3 px-4 pt-2">
        <p className="text-sm text-[#5f6368]">
          {agentName} · {tenantName}
        </p>
        <button
          type="button"
          className="text-xs rounded-full px-3 py-1 border border-[#dadce0] text-[#5f6368] bg-white"
          onClick={() => setVoiceOn((v) => !v)}
        >
          {voiceOn ? "Voz on" : "Voz off"}
        </button>
      </div>

      <div ref={box} className="flex-1 min-h-0 overflow-y-auto">
        {fresh ? (
          <div className="h-full grid place-items-center px-6 text-center">
            <div>
              <div className="flex justify-center mb-5">
                <Sparkle size={48} pulse={speaking || busy} />
              </div>
              <h1 className="text-[2rem] sm:text-5xl font-normal tracking-tight">Hola, {first}</h1>
              <p className="mt-3 text-[#5f6368] text-base sm:text-lg max-w-md mx-auto">
                Soy {agentName}. Pregúntame cómo va {tenantName}.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="chip" disabled={busy} onClick={() => void send(s)}>
                    {s}
                  </button>
                ))}
              </div>
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
                  <p className="chat-agent">{m.text}</p>
                </div>
              ),
            )}
            {busy ? <ThinkingRow label="Consultando el negocio" /> : null}
            {speaking && !busy ? <ThinkingRow label="Hablando" /> : null}
          </div>
        )}
      </div>

      <form
        className="shrink-0 px-3 sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 max-w-3xl mx-auto w-full"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
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
            placeholder={`Pregúntale a ${agentName}`}
            className="flex-1 min-w-0"
            disabled={busy}
            autoComplete="off"
          />
          <button type="submit" className="send-btn" disabled={busy || !text.trim()} aria-label="Enviar">
            <IconSend />
          </button>
        </div>
      </form>
    </div>
  );
}
