import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const playwrightModule = process.env.PLAYWRIGHT_MODULE || "/home/sebastian/TRABAJO/02_DESARROLLO/01_BAYONA/SBAYONA-WEB-PRIME-20261004/node_modules/playwright/index.mjs";
const baseUrl = process.env.BAYONA_URL || "http://127.0.0.1:8086/";
const { chromium } = await import(pathToFileURL(playwrightModule));
const catalog = JSON.parse(fs.readFileSync(new URL("../trainingym/catalog.json", import.meta.url), "utf8"));
const sample = catalog.find((row) => row.video_disponible_local && row.video_url);
assert.ok(sample, "el catálogo debe tener una ficha de muestra con referencia a vídeo");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#luxe-cta-entrar").click();
  await page.locator("#entry-go").waitFor({ state: "visible" });
  await page.locator("#entry-go").click();
  await page.locator("#ob-name").fill("QA Video");
  for(let step=0;step<5;step++) await page.locator("#ob-next").click();
  await page.locator("#ob-done").click();
  await page.locator("#ob-layer").waitFor({state:"detached"});
  await page.waitForTimeout(700);
  const tour = page.locator('[data-tour="skip"]');
  if(await tour.isVisible()) await tour.click();
  const checkin = page.locator('[data-checkin-action="skip"]');
  if(await checkin.isVisible()) await checkin.click();
  await page.locator('#panel-nav [data-go="training"]').click();
  await page.getByRole("button", { name: "ABRIR PROPLAYER" }).click();
  await page.locator("#proplayer-search").waitFor();
  assert.equal(await page.locator(".proplayer-metric-value").first().innerText(), "3.141");
  await page.locator("#proplayer-search").fill(sample.nombre);
  await page.locator('.proplayer-card button', { hasText: "PROBAR VÍDEO" }).click();
  const video = page.locator("[data-proplayer-video] video");
  await video.waitFor();
  await page.waitForFunction(() => document.querySelector("[data-proplayer-video] .proplayer-video-state:not([hidden])")?.textContent.startsWith("Demostración lista."), null, { timeout: 20000 });
  assert.equal(await video.evaluate((node) => node.preload), "metadata");
  assert.ok(await video.evaluate((node) => node.readyState >= 1), "el navegador debe recibir metadatos del vídeo muestra");
  await video.evaluate((node) => node.play());
  await page.waitForFunction(() => document.querySelector("[data-proplayer-video] video")?.currentTime > 0, null, { timeout: 5000 });
  await video.evaluate((node) => { window.__bayonaQaVideo = node; });
  await page.getByRole("button", { name: "CERRAR" }).click();
  await page.waitForFunction(() => window.__bayonaQaVideo?.paused === true);

  let failedRequests = 0;
  const missingSource = "https://acajakbiebfp9udy.public.blob.vercel-storage.com/proplayer/qa-missing.mp4";
  page.on("request", (request) => { if (request.url() === missingSource) failedRequests += 1; });
  await page.locator(".proplayer-card button", { hasText: "PROBAR VÍDEO" }).click();
  const failedVideo = page.locator("[data-proplayer-video] video");
  await failedVideo.waitFor();
  await page.route(missingSource, (route) => route.abort());
  await failedVideo.evaluate((node, source) => { node.src = source; node.load(); }, missingSource);
  await page.waitForFunction(() => document.querySelector("[data-proplayer-video] .proplayer-video-state.danger"), null, { timeout: 5000 });
  assert.equal(await page.getByRole("button", { name: "REINTENTAR VÍDEO" }).isVisible(), true);
  await page.waitForTimeout(400);
  assert.equal(failedRequests, 1, "un fallo no debe generar reintentos automáticos");
  await page.getByRole("button", { name: "REINTENTAR VÍDEO" }).click();
  await page.waitForTimeout(400);
  assert.equal(failedRequests, 2, "el nuevo intento solo ocurre tras pulsar el control");
  assert.deepEqual(errors, [], "sin errores JavaScript de página o consola");

  console.log(`✅ Flujo landing → #entry-go → app QA sintética → biblioteca → búsqueda → reproducción verificada (${sample.nombre}).`);
  console.log("✅ Al cerrar, el vídeo se pausa; el error muestra alternativa y reintento manual sin bucle.");
} finally {
  await context.close();
  await browser.close();
}
