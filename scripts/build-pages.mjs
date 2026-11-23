import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const distDir = path.join(rootDir, "dist");

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

function copyRecursive(srcRel, destRel = srcRel) {
  const src = path.join(rootDir, srcRel);
  const dest = path.join(distDir, destRel);
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(srcRel, entry), path.join(destRel, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

copyRecursive("index.html");
copyRecursive("index.html", "404.html");
copyRecursive("edd_contra_o_mundo.html");
copyRecursive("firebase-applet-config.json");
copyRecursive("metadata.json");
copyRecursive("styles/main.css");
copyRecursive("assets");
copyRecursive("js");

fs.writeFileSync(path.join(distDir, ".nojekyll"), "", "utf8");
console.log("Built static GitHub Pages bundle in ./dist");
