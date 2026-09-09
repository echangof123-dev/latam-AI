const { spawn, spawnSync } = require("child_process");
const path = require("path");

const root = __dirname;
const node = process.execPath;
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");

function sleep(seconds) {
  spawnSync(
    process.platform === "win32" ? "timeout" : "sleep",
    process.platform === "win32" ? ["/t", String(seconds), "/nobreak"] : [String(seconds)],
  );
}

function run(args) {
  return spawnSync(node, args, { cwd: root, env: process.env, stdio: "inherit" }).status ?? 1;
}

if (process.env.RENDER && process.env.DATABASE_URL && !String(process.env.DATABASE_URL).includes("sslmode")) {
  const u = process.env.DATABASE_URL;
  process.env.DATABASE_URL = u.includes("?") ? `${u}&sslmode=require` : `${u}?sslmode=require`;
}

console.log("Puerto:", process.env.PORT || "3000");
console.log("DATABASE_URL definida:", Boolean(process.env.DATABASE_URL));

let migrated = false;
for (let i = 1; i <= 15; i++) {
  console.log("Prisma migrate, intento", i);
  if (run([prismaCli, "migrate", "deploy"]) === 0) {
    migrated = true;
    break;
  }
  sleep(3);
}

if (!migrated) {
  console.error("La migración no completó. Arrancamos el HTTP igual para evitar 502.");
}

if (process.env.RUN_SEED === "true") {
  run([path.join(root, "prisma", "seed.mjs")]);
}

const port = String(process.env.PORT || "3000");
console.log("Arrancando Next en 0.0.0.0:" + port);
const child = spawn(node, [nextCli, "start", "-H", "0.0.0.0", "-p", port], {
  cwd: root,
  env: { ...process.env, PORT: port, HOSTNAME: "0.0.0.0" },
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 1));
