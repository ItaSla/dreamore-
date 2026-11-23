import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createInitialData } = require("../database/database.js");

const rootDir = path.resolve(import.meta.dirname, "..");
const outPath = path.join(rootDir, "js", "static-seed.js");

const initial = createInitialData();
initial.users = (initial.users || []).map((u) => {
  const clean = { ...u };
  delete clean.pwHash;
  return clean;
});

const content = `// Auto-generated from database/database.js by scripts/generate-static-seed.mjs
export function createStaticBootstrap() {
  return ${JSON.stringify(initial, null, 2)};
}
`;

fs.writeFileSync(outPath, content, "utf8");
console.log("Generated js/static-seed.js");
