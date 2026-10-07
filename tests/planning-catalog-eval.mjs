#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join,dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { searchExercises, exerciseFacets, normalizeCoachText } from "../js/coach-lab.js";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const rows=JSON.parse(readFileSync(join(root,"trainingym/catalog.json"),"utf8"));
let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n🏋️ PLANNING STUDIO · CATÁLOGO REAL\n");

ok(Array.isArray(rows)&&rows.length>=3000,`catálogo real disponible (${rows.length} ejercicios)`);
ok(rows.every((x)=>x&&Number.isFinite(Number(x.pos))&&typeof x.nombre==="string"&&x.nombre.trim()),"cada ejercicio tiene posición y nombre");
ok(rows.some((x)=>x.video_disponible_local===true),"catálogo incluye vídeos disponibles");
ok(rows.some((x)=>x.video_disponible_local===false),"catálogo distingue ejercicios sin vídeo");

const facets=exerciseFacets(rows);
ok(facets.types.length>=2&&facets.muscles.length>=5,"facetas reales tienen tipos y grupos musculares");
ok(facets.resistances.length>=2&&facets.efforts.length>=2,"facetas reales tienen resistencia y esfuerzo");

const video=searchExercises(rows,{availability:"video"},80);
ok(video.length>0&&video.every((x)=>x.video_disponible_local===true),"filtro vídeo solo devuelve media disponible");

const first=rows.find((x)=>x.nombre&&x.grupo_muscular);
const tokenName=normalizeCoachText(first.nombre).split(/\s+/)[0];
const tokenMuscle=normalizeCoachText(first.grupo_muscular).split(/\s+/)[0];
const mixed=searchExercises(rows,{q:`${tokenName} ${tokenMuscle}`},200);
ok(mixed.some((x)=>x.source_id===first.source_id),"búsqueda multi-token cruza nombre y músculo sobre catálogo real");

const muscle=facets.muscles[0];
const filtered=searchExercises(rows,{muscle},5000);
ok(filtered.length>0&&filtered.every((x)=>x.grupo_muscular===muscle),"filtro muscular exacto es estable");

const type=facets.types[0];
const typed=searchExercises(rows,{type},5000);
ok(typed.length>0&&typed.every((x)=>x.tipo===type),"filtro por tipo es estable");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
