import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { build } from "esbuild";

await mkdir("dist", { recursive: true });
for (const path of ["style.css", "studio.js"]) {
  await cp(path, "dist/" + path);
}

let html = await readFile("index.html", "utf8");
const assets = [
  ["favicon.svg", markup => markup.replace(/^.*rel="icon".*\r?\n/m, "")
    .replace(/<img src="\.\/assets\/favicon\.svg"[^>]*> /, "")],
  ["demo-hype.jpg", markup => markup.replace(' poster="./assets/demo-hype.jpg"', "")],
  ["demo-hype.mp4", markup => markup.replace('id="demo"', 'id="demo" hidden')
    .replace("Choose a local video or load the sample.", "Choose a local video.")],
];
for (const [name, fallback] of assets) {
  const path = "assets/" + name;
  const info = await stat(path, { throwIfNoEntry: false });
  if (info?.isFile()) {
    await mkdir("dist/assets", { recursive: true });
    await cp(path, "dist/" + path);
  } else {
    html = fallback(html);
  }
}
await writeFile("dist/index.html", html);

await build({
  entryPoints: ["storage-client.mjs"],
  bundle: true,
  minify: true,
  format: "esm",
  outfile: "dist/storage-client.js",
});
