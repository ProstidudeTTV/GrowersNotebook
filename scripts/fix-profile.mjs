import { readFileSync, writeFileSync } from "fs";

const f = "apps/web/app/(site)/u/[userId]/profile-view.tsx";
let content = readFileSync(f, "utf8");
content = content.replaceAll(
  'shadow-[0_0_16px_rgba(255,69,0,0.35)] transition hover:bg-[#ff5414]',
  "shadow-sm transition hover:brightness-110"
);
writeFileSync(f, content);
console.log("Done");
