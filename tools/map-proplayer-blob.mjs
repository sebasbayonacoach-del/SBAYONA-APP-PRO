import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const catalogPath = path.join(root, "trainingym", "catalog.json");
const manifestPath = path.join(root, "trainingym", "blob-manifest.json");

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

if (!Array.isArray(catalog) || catalog.length !== 3141) {
  throw new Error(`Catálogo inesperado: ${Array.isArray(catalog) ? catalog.length : "no-array"}`);
}

const manifestNames = Object.keys(manifest).filter((name) => manifest[name]?.url);
if (manifestNames.length !== 1607) {
  throw new Error(`Manifest incompleto: ${manifestNames.length}/1607 URLs`);
}

let withMedia = 0;
let mapped = 0;
const used = new Set();

for (const record of catalog) {
  const name = record.video_archivo_local || "";
  if (!name) {
    delete record.video_url;
    continue;
  }
  withMedia += 1;
  const item = manifest[name];
  if (!item?.url) {
    throw new Error(`Falta URL para ${name} (registro ${record.pos ?? "?"})`);
  }
  record.video_url = item.url;
  record.video_cdn = "vercel-blob";
  used.add(name);
  mapped += 1;
}

if (withMedia !== 2255 || mapped !== 2255 || used.size !== 1607) {
  throw new Error(`Conteos inesperados: withMedia=${withMedia}, mapped=${mapped}, unique=${used.size}`);
}

fs.writeFileSync(catalogPath, JSON.stringify(catalog) + "\n");
console.log(JSON.stringify({
  records: catalog.length,
  videoBackedRecords: mapped,
  uniqueUrls: used.size,
  missingVideoRecords: catalog.length - mapped,
}, null, 2));
