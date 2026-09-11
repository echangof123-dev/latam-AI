"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Biz = { name: string; phone: string };
type Msg = { role: "user" | "ai"; text: string };

export function ReceptionistChat({ businesses }: { businesses: Biz[] }) {
  const [to, setTo] = useState(businesses[0]?.phone || "");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
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
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ai",
      text: "Hola, soy Sofía. Pregúntame por precios, horarios o una reserva.",
    },
  ]);
  const box = useRef<HTMLDivElement>(null);
  const recRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const bizName = useMemo(
    () => businesses.find((b) => b.phone === to)?.name || "el negocio",
    [businesses, to],
  );

  useEffect(() => {
    setMsgs([
      {
        role: "ai",
        text: `Hola, soy Sofía, de ${bizName}. Dime en qué te ayudo.`,
      },
    ]);
  }, [to, bizName]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  async function speakHuman(phrase: string) {
    audioRef.current?.pause();
    try {
      const res = await fetch("/api/channels/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: phrase }),
      });
      const data = await res.json().catch(() => null);
      if (data?.audio) {
        const audio = new Audio(data.audio);
        audioRef.current = audio;
        audio.onplay = () => setSpeaking(true);
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        await audio.play();
        return;
      }
    } catch {
      /* texto ya está en pantalla */
    }
    setSpeaking(false);
  }

  async function send(raw: string) {
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
        data?.reply ||
        (res.ok ? "No pude responder ahora." : "El servidor no respondió. Espera un minuto y reintenta.");
      setMsgs((m) => [...m, { role: "ai", text: reply }]);
      setBusy(false);
      void speakHuman(reply);
      return;
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "Hay un problema de conexión. Intenta otra vez." }]);
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

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-6 py-5 border-b border-white/10">
        <p className="text-xl font-semibold">Sofía</p>
        <p className="text-sm text-slate-400">Recepcionista IA de {bizName}</p>
        <p className="text-xs text-emerald-400 mt-1">
          {speaking ? "Hablando…" : busy ? "Pensando…" : listening ? "Te escucho…" : "En línea"}
        </p>
      </div>

      {businesses.length > 1 ? (
        <div className="px-6 pt-4">
          <label className="block mb-1">Negocio</label>
          <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full">
            {businesses.map((b) => (
              <option key={b.phone} value={b.phone}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div ref={box} className="h-[380px] overflow-y-auto px-6 py-4 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? "bg-gold-500 text-ink-950" : "bg-white/10 text-slate-100"
              }`}
            >
              {m.text}
            </p>
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
          placeholder="Escribe aquí…  Ej: Hola, quiero un corte"
          className="flex-1"
          disabled={busy}
        />
        <button type="submit" className="btn-gold" disabled={busy}>
          {busy ? "…" : "Enviar"}
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
