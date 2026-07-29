import { spawn } from "node:child_process";
const proc = spawn("pnpm", ["exec", "tsx", "src/index.ts"], { stdio: ["ignore","pipe","pipe"], shell: true, env: { ...process.env, PORT: "5055" } });
let out = "";
proc.stdout.on("data", d => out += d);
proc.stderr.on("data", d => out += d);
await new Promise(r => setTimeout(r, 6000));
try { const h = await fetch("http://127.0.0.1:5055/health"); console.log("tsx /health ->", h.status); }
catch (e) { console.log("tsx request failed:", e.message); }
proc.kill();
console.log("--- output ---\n" + out.slice(0, 1200));
