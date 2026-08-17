import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");
const standaloneNextDir = join(standaloneDir, ".next");
const staticSource = join(root, ".next", "static");
const staticTarget = join(standaloneNextDir, "static");
const publicSource = join(root, "public");
const publicTarget = join(standaloneDir, "public");

if (!existsSync(standaloneDir)) {
  console.log("Standalone output not found; skipping asset copy.");
  process.exit(0);
}

mkdirSync(standaloneNextDir, { recursive: true });

if (existsSync(staticSource)) {
  cpSync(staticSource, staticTarget, { recursive: true });
  console.log("Copied .next/static into standalone output.");
}

if (existsSync(publicSource)) {
  cpSync(publicSource, publicTarget, { recursive: true });
  console.log("Copied public into standalone output.");
}
