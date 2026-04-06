/**
 * matrix-js-sdk-crypto-wasm loads the .wasm via import.meta.url by default; after Next.js
 * bundles the JS, that URL no longer points at the wasm file. Copy it into public/ and
 * pass an absolute URL to initAsync() from the client (see messages-panel.tsx).
 */
const fs = require("fs");
const path = require("path");

const webRoot = path.join(__dirname, "..");
const repoRoot = path.join(webRoot, "..", "..");
const resolveRoots = [webRoot, path.join(webRoot, ".."), repoRoot];

let pkgRoot;
for (const root of resolveRoots) {
  try {
    pkgRoot = path.dirname(
      require.resolve("@matrix-org/matrix-sdk-crypto-wasm/package.json", {
        paths: [root],
      }),
    );
    break;
  } catch {
    /* try next */
  }
}
if (!pkgRoot) {
  const guessPkgs = [
    path.join(
      webRoot,
      "node_modules",
      "@matrix-org",
      "matrix-sdk-crypto-wasm",
      "package.json",
    ),
    path.join(
      repoRoot,
      "node_modules",
      "@matrix-org",
      "matrix-sdk-crypto-wasm",
      "package.json",
    ),
  ];
  for (const pkgJson of guessPkgs) {
    if (fs.existsSync(pkgJson)) {
      pkgRoot = path.dirname(pkgJson);
      break;
    }
  }
}
if (!pkgRoot) {
  console.error(
    "copy-matrix-wasm: cannot resolve @matrix-org/matrix-sdk-crypto-wasm; tried:\n  " +
      resolveRoots.join("\n  "),
  );
  process.exit(1);
}
const src = path.join(pkgRoot, "pkg", "matrix_sdk_crypto_wasm_bg.wasm");
const destDir = path.join(webRoot, "public", "wasm");
const dest = path.join(destDir, "matrix_sdk_crypto_wasm_bg.wasm");

if (!fs.existsSync(src)) {
  console.error(
    "copy-matrix-wasm: missing package file:\n  " + src + "\nRun pnpm install.",
  );
  process.exit(1);
}
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log("copy-matrix-wasm: copied to public/wasm/matrix_sdk_crypto_wasm_bg.wasm");
