import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next", ".git"].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if ([".tsx", ".ts", ".css"].includes(extname(full))) out.push(full);
  }
  return out;
}

const replacements = [
  // Hover button states → use brightness
  [/hover:bg-\[#ff5414\]/g, "hover:brightness-110"],
  [/hover:bg-\[#ff5724\]/g, "hover:brightness-110"],
  [/hover:bg-\[#ff7d4c\]/g, "hover:brightness-110"],
  [/hover:bg-\[#ff6a38\]/g, "hover:brightness-110"],

  // Solid background uses → CSS variable
  [/bg-\[#ff6a38\]/g, "bg-[var(--gn-accent)]"],
  [/bg-\[#ff5414\]/g, "bg-[var(--gn-accent)]"],
  [/bg-\[#ff5724\]/g, "bg-[var(--gn-accent)]"],

  // Text color uses → CSS variable
  [/text-\[#ff6a38\]/g, "text-[var(--gn-accent)]"],
  [/text-\[#ff5414\]/g, "text-[var(--gn-accent)]"],

  // Border color uses → CSS variable
  [/border-\[#ff6a38\]/g, "border-[var(--gn-accent)]"],

  // Hardcoded rgba shadows → simplified
  [/shadow-\[0_0_16px_rgba\(255,69,0,0\.35\)\]/g, "shadow-sm"],
  [/shadow-\[0_2px_14px_rgba\(255,69,0,0\.35\)\]/g, "shadow-sm"],
  [/shadow-\[0_0_20px_rgba\(255,69,0,0\.4\)\]/g, "shadow-md"],
  [/shadow-\[0_4px_28px_rgba\(255,69,0,0\.45\)\]/g, "shadow-md"],
  [/shadow-\[0_12px_40px_-12px_rgba\(255,69,0,0\.55\)\]/g, "shadow-lg"],
  [/hover:shadow-\[0_0_20px_rgba\(255,69,0,0\.4\)\]/g, ""],
  [/hover:shadow-\[0_4px_28px_rgba\(255,69,0,0\.45\)\]/g, ""],
  [/shadow-\[0_0_12px_rgba\(255,69,0,0\.3\)\]/g, "shadow-sm"],
  [/shadow-\[0_0_16px_rgba\(255,69,0,0\.35\)\]/g, "shadow-sm"],
];

const files = walk("apps/web");
let totalCount = 0;

for (const f of files) {
  const original = readFileSync(f, "utf8");
  let content = original;
  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }
  if (content !== original) {
    writeFileSync(f, content);
    totalCount++;
    console.log("Updated:", f);
  }
}

console.log(`\nDone — updated ${totalCount} files.`);
