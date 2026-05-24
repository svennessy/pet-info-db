/**
 * @deprecated Use `npm run dataset:cat:fetch` and `npm run dataset:cat:process`.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const extra = process.argv.slice(2);

function run(script) {
  const result = spawnSync(npm, ["run", script, "--", ...extra], {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("setup:candid-cats → dataset:cat:fetch + dataset:cat:process\n");
run("dataset:cat:fetch");
run("dataset:cat:process");
