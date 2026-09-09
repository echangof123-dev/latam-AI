const { spawn, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = __dirname;
const node = process.execPath;
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const standalone = path.join(root, "server.js");

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

const port = String(process.env.PORT || "3000");
console.log("Puerto:", port);
console.log("DATABASE_URL definida:", Boolean(process.env.DATABASE_URL));

for (let i = 1; i <= 8; i++) {
  console.log("Prisma migrate, intento", i);
  if (run([prismaCli, "migrate", "deploy"]) === 0) break;
  sleep(2);
}

console.log("Cargando datos de demo...");
run([path.join(root, "prisma", "ensure-column.cjs")]);
run([path.join(root, "prisma", "seed.mjs")]);

const env = { ...process.env, PORT: port };
delete env.HOSTNAME;

console.log("Arrancando HTTP en 0.0.0.0:" + port);
const child = fs.existsSync(standalone)
  ? spawn(node, [standalone], {
      cwd: root,
      env: { ...env, HOSTNAME: "0.0.0.0" },
      stdio: "inherit",
    })
  : spawn(node, [nextCli, "start", "-H", "0.0.0.0", "-p", port], {
      cwd: root,
      env,
      stdio: "inherit",
    });
child.on("exit", (code) => process.exit(code ?? 1));
