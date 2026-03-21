// scripts/dev.mjs
import { spawn } from "node:child_process";

console.log("scripts/dev.mjs is deprecated. Use `npm run dev` directly.");

const child = spawn("npm", ["run", "dev"], {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
