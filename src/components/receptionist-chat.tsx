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
      text: "Hola, soy Sofía, la recepcionista. Puedes escribirme o pulsar el micrófono y hablar.",
    },
  ]);
  const box = useRef<HTMLDivElement>(null);
  const recRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  const bizName = useMemo(
    () => businesses.find((b) => b.phone === to)?.name || "el negocio",
    [businesses, to],
  );

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  function speak(phrase: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(phrase);
    u.lang = "es-CO";
    u.rate = 1;
    const voices = window.speechSynthesis.getVoices();
    const es = voices.find((v) => v.lang.startsWith("es"));
    if (es) u.voice = es;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  async function send(raw: string, channel: "WEB" | "VOICE_CALL" = "WEB") {
    const clean = raw.trim();
    if (!clean) return;
    if (!to) {
      setMsgs((m) => [...m, { role: "ai", text: "Elige un negocio arriba y vuelve a enviar." }]);
      return;
    }
    if (busy) return;
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", text: clean }]);
    setText("");
    try {
      const res = await fetch("/api/channels/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, from: fromPhone, text: clean, channel }),
      });
      const data = await res.json().catch(() => null);
      const reply =
        data?.reply ||
        (res.ok ? "No pude responder ahora." : "El servidor no respondió. Espera un minuto y reintenta.");
      setMsgs((m) => [...m, { role: "ai", text: reply }]);
      speak(reply);
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "Hay un problema de conexión. Intenta otra vez." }]);
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    const SR = (window as unknown as { SpeechRecognition?: new () => BrowserRecog; webkitSpeechRecognition?: new () => BrowserRecog })
      .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => BrowserRecog }).webkitSpeechRecognition;
    if (!SR) {
      alert("Este navegador no permite dictado. Usa Chrome o Edge, o escribe el mensaje.");
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
      const said = ev.results[0][0].transcript;
      void send(said, "VOICE_CALL");
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="bg-gradient-to-r from-ink-900 to-[#152238] px-6 py-5 flex items-center gap-4">
        <div className={`relative h-20 w-20 rounded-full overflow-hidden border-2 border-gold-500 ${speaking ? "avatar-talk" : ""}`}>
          <img src="/sofia.png" alt="Sofía, recepcionista" className="h-full w-full object-cover" />
        </div>
        <div>
          <p className="text-xl font-semibold">Sofía</p>
          <p className="text-sm text-slate-400">Recepcionista de {bizName}</p>
          <p className="text-xs text-emerald-400 mt-1">
            {speaking ? "Hablando…" : listening ? "Te escucho…" : "Lista · texto y voz"}
          </p>
        </div>
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

      <div ref={box} className="h-[340px] overflow-y-auto px-6 py-4 space-y-3">
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
          e.stopPropagation();
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
          Enviar
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
