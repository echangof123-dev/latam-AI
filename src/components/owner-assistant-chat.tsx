"use client";

import { useEffect, useRef, useState } from "react";
import { OWNER_VOICE } from "@/lib/brand";

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
  const [listening, setListening] = useState(false);
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
  const recRef = useRef<{ start: () => void; stop: () => void } | null>(null);
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

  async function send(raw: string) {
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
      if (data?.reply) void speakHuman(reply);
      return;
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "Hay un problema de conexión." }]);
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    const SR =
      (window as unknown as { SpeechRecognition?: new () => BrowserRecog; webkitSpeechRecognition?: new () => BrowserRecog })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => BrowserRecog }).webkitSpeechRecognition;
    if (!SR) {
      alert("Este navegador no permite dictado. Usa Chrome o Edge, o escribe.");
      return;
    }
    if (listening && recRef.current) {
      recRef.current.stop();
      setListening(false);
      return;
    }
    audioRef.current?.pause();
    setSpeaking(false);
    const rec = new SR();
    rec.lang = "es-CO";
    rec.interimResults = false;
    rec.onresult = (ev: { results: { 0: { 0: { transcript: string } } } }) => {
      void send(ev.results[0][0].transcript);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  const status = speaking
    ? "Hablando…"
    : busy
      ? "Consultando el negocio…"
      : listening
        ? "Te escucho…"
        : voiceOn
          ? "En línea · voz de hombre"
          : "En línea · sin voz";

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-6 py-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`agent-face agent-face-owner ${speaking ? "ring-2 ring-sky-300/60" : ""}`}>{initial}</span>
          <div>
            <p className="text-lg font-semibold leading-tight">{agentName}</p>
            <p className="text-sm text-slate-400">{tenantName} · asistente interno</p>
            <p className="text-xs text-emerald-400 mt-0.5">{status}</p>
          </div>
        </div>
        <button
          type="button"
          className={`text-xs rounded-full px-3 py-1.5 border ${
            voiceOn ? "border-gold-500/50 text-gold-400" : "border-white/15 text-slate-400"
          }`}
          onClick={() => setVoiceOn((v) => !v)}
        >
          {voiceOn ? "Voz encendida" : "Voz apagada"}
        </button>
      </div>

      <div className="px-4 pt-4 flex flex-wrap gap-2">
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

      <div ref={box} className="h-[420px] overflow-y-auto px-6 py-4 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <p className={m.role === "user" ? "chat-user" : "chat-agent"}>{m.text}</p>
          </div>
        ))}
      </div>

      <form
        className="border-t border-white/10 p-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        <button
          type="button"
          onClick={toggleMic}
          className={`rounded-xl px-4 font-semibold ${listening ? "bg-red-500 text-white" : "btn-ghost"}`}
        >
          {listening ? "Parar" : "Hablar"}
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Pregúntale a ${agentName}…`}
          className="flex-1"
          disabled={busy}
        />
        <button type="submit" className="btn-gold" disabled={busy}>
          {busy ? "…" : "Preguntar"}
        </button>
      </form>
    </div>
  );
}

type BrowserRecog = {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
};
