import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditProplayerCatalog } from "../js/data/proplayer-catalog-audit.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, "trainingym", "catalog.json");
const records = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const audit = auditProplayerCatalog(records);
console.log(JSON.stringify(audit, null, 2));
if (audit.errors.length) process.exitCode = 1;
