/**
 * Main process를 esbuild로 단일 CJS 파일로 번들링한다.
 *
 * 이유: Electron portable exe에서 ESM 로더가 asar 내부의
 * package.json을 읽지 못하는 문제를 우회하기 위해,
 * Main process를 CJS로 번들링하여 ESM 해석을 제거한다.
 *
 * import.meta.url 폴리필: CJS에는 import.meta가 없으므로
 * __filename 기반으로 동일 값을 banner에서 주입한다.
 */
import { build } from "esbuild";

await build({
  entryPoints: ["dist/main/index.js"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "dist/main/index.cjs",
  sourcemap: true,
  external: [
    "electron",
    "electron-updater",
    "better-sqlite3",
    "keytar",
    "pino",
    "pino-pretty",
  ],
  banner: {
    js: 'var __import_meta_url = require("url").pathToFileURL(__filename).href;',
  },
  define: {
    "import.meta.url": "__import_meta_url",
  },
});

console.log("✓ Main process bundled → dist/main/index.cjs");

// ── Preload도 동일하게 CJS 번들링 ──
// preload가 require("../main/ipc/channels.js")로 ESM 파일을 참조하면
// Node.js 20에서 ERR_REQUIRE_ESM가 발생하므로, esbuild로 의존성을 인라인한다.
await build({
  entryPoints: ["dist/preload/index.js"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "dist/preload/index.cjs",
  sourcemap: true,
  external: ["electron"],
});

console.log("✓ Preload bundled → dist/preload/index.cjs");
