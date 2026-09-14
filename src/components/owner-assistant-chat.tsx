"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OWNER_VOICE } from "@/lib/brand";
import { useVoiceCapture } from "./voice-capture";

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
  const initial = agentName.slice(0, 1).toUpperCase();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ai",
      text: `Hola ${first}. Soy ${agentName}, asistente de ${tenantName}. Pregúntame por citas, clientes, horarios, ventas o cómo va ${clientName} con el público.`,
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
  }, [msgs]);

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
        setBusy(false);
        if (data?.reply && (heard || voiceOnRef.current)) void speakHuman(reply);
        return;
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
          { role: "ai", text: "No alcancé a oír. En el celular pulsa Hablar, habla y luego Parar; o escribe." },
        ]);
        return;
      }
      void send(said, true);
    },
    [send],
  );

  const { listening, toggle } = useVoiceCapture(onVoice);

  const status = speaking
    ? "Hablando…"
    : busy
      ? "Consultando el negocio…"
      : listening
        ? "Te escucho… pulsa Parar"
        : voiceOn
          ? "En línea · voz de hombre"
          : "En línea · sin voz";

  return (
    <div className="card overflow-hidden p-0 flex flex-col h-[calc(100dvh-12.5rem)] sm:h-[min(38rem,calc(100dvh-8rem))]">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`agent-face agent-face-owner ${speaking ? "ring-2 ring-sky-300/60" : ""}`}>{initial}</span>
          <div className="min-w-0">
            <p className="text-base sm:text-lg font-semibold leading-tight truncate">{agentName}</p>
            <p className="text-xs sm:text-sm text-slate-400 truncate">{tenantName} · asistente interno</p>
            <p className="text-xs text-emerald-400 mt-0.5">{status}</p>
          </div>
        </div>
        <button
          type="button"
          className={`text-xs rounded-full px-3 py-1.5 border shrink-0 ${
            voiceOn ? "border-gold-500/50 text-gold-400" : "border-white/15 text-slate-400"
          }`}
          onClick={() => setVoiceOn((v) => !v)}
        >
          {voiceOn ? "Voz encendida" : "Voz apagada"}
        </button>
      </div>

      <div className="px-3 pt-3 flex flex-wrap gap-2 shrink-0">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="text-xs rounded-full border border-white/15 px-3 py-1.5 text-slate-300 hover:border-gold-500/50 hover:text-gold-400"
            disabled={busy}
            onClick={() => void send(s)}
          >
            {s}
          </button>
        ))}
      </div>

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
          void send(text);
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
          placeholder={`Pregúntale a ${agentName}…`}
          className="flex-1 min-w-0"
          disabled={busy}
          autoComplete="off"
        />
        <button type="submit" className="btn-gold shrink-0" disabled={busy}>
          {busy ? "…" : "Preguntar"}
        </button>
      </form>
    </div>
  );
}
