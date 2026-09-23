import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(projectRoot, "dist-pages");

if (!existsSync(resolve(outputDir, "index.html"))) {
  throw new Error("dist-pages/index.html 不存在，请先运行 Vite 构建。");
}

mkdirSync(resolve(projectRoot, "assets"), { recursive: true });
cpSync(resolve(outputDir, "assets"), resolve(projectRoot, "assets"), {
  recursive: true,
});
copyFileSync(resolve(outputDir, "index.html"), resolve(projectRoot, "index.html"));
copyFileSync(
  resolve(projectRoot, "public/favicon.svg"),
  resolve(projectRoot, "favicon.svg"),
);

if (existsSync(resolve(projectRoot, "_headers"))) {
  copyFileSync(resolve(projectRoot, "_headers"), resolve(outputDir, "_headers"));
}

console.log("Cloudflare Pages 静态成品已同步到项目根目录。");
