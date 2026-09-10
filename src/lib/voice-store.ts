const TTL_MS = 15 * 60 * 1000;
const store = new Map<string, { buf: Buffer; exp: number }>();

function prune() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.exp < now) store.delete(k);
  }
}

export function putVoiceMp3(buf: Buffer) {
  prune();
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  store.set(id, { buf, exp: Date.now() + TTL_MS });
  return id;
}

export function getVoiceMp3(id: string) {
  const row = store.get(id);
  if (!row || row.exp < Date.now()) {
    store.delete(id);
    return null;
  }
  return row.buf;
}

export function publicAppUrl() {
  const raw = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || "https://ejeuno.onrender.com";
  return raw.replace(/\/$/, "").replace(/0\.0\.0\.0[:\d]*/, "https://ejeuno.onrender.com");
}
