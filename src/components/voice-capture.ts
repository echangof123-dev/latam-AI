"use client";

import { useCallback, useRef, useState } from "react";

type Recog = {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function speechEngine() {
  const w = window as unknown as {
    SpeechRecognition?: new () => Recog;
    webkitSpeechRecognition?: new () => Recog;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function recorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export function useVoiceCapture(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const speechRef = useRef<Recog | null>(null);
  const chunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    recRef.current?.state === "recording" && recRef.current.stop();
    speechRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setListening(false);
  }, []);

  const startSpeech = useCallback(() => {
    const SR = speechEngine();
    if (!SR) return false;
    const rec = new SR();
    rec.lang = "es-CO";
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const said = ev.results[0][0].transcript;
      if (said) onText(said);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    speechRef.current = rec;
    rec.start();
    setListening(true);
    return true;
  }, [onText]);

  const toggle = useCallback(async () => {
    if (listening) {
      stop();
      return;
    }
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mime = recorderMime();
        const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        chunks.current = [];
        rec.ondataavailable = (e) => {
          if (e.data.size) chunks.current.push(e.data);
        };
        rec.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          setListening(false);
          const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
          if (blob.size < 800) {
            onText("");
            return;
          }
          const fd = new FormData();
          const ext = rec.mimeType.includes("mp4") || rec.mimeType.includes("aac") ? "m4a" : "webm";
          fd.append("file", blob, `nota.${ext}`);
          try {
            const res = await fetch("/api/channels/transcribe", { method: "POST", body: fd });
            const data = (await res.json().catch(() => null)) as { text?: string } | null;
            const said = (data?.text || "").trim();
            onText(said);
          } catch {
            if (!startSpeech()) onText("");
          }
        };
        recRef.current = rec;
        rec.start(250);
        setListening(true);
        return;
      } catch {
        /* permiso denegado: dictado del navegador */
      }
    }
    if (!startSpeech()) {
      onText("");
    }
  }, [listening, onText, startSpeech, stop]);

  return { listening, toggle };
}
