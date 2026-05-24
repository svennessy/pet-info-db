/**
 * @deprecated Use `npm run dataset:other:fetch` and `npm run dataset:other:process`.
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

console.log("setup:other-pet-photos → dataset:other:fetch + dataset:other:process\n");
run("dataset:other:fetch");
run("dataset:other:process");
