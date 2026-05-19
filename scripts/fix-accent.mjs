import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if ([".tsx", ".ts", ".css"].includes(extname(full))) out.push(full);
  }
  return out;
}

const files = walk("apps/web");
let count = 0;
for (const f of files) {
  const content = readFileSync(f, "utf8");
  if (!content.includes("#ff4500")) continue;
  const updated = content.replaceAll("#ff4500", "var(--gn-accent)");
  writeFileSync(f, updated);
  count++;
  console.log("  Updated:", f);
}
console.log(`\nDone — replaced #ff4500 in ${count} files.`);
