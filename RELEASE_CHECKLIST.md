# BAYONA · RELEASE_CHECKLIST.md
### Checklist de lanzamiento — se firma con números, no con «creo que está bien»

> Regla madre: **nada sale sin la batería verde y la matriz limpia.** Lo que no se puede
> medir se explica; lo bloqueado se marca con su motivo. Un release sin números no existe.

---

## 0 · Estado del contenido
- [ ] **Versión** semver fijada: `v____.__.__` (coherente en `package.json`, `sw.js` cache-name, `index.html`).
- [ ] **Changelog** escrito (qué cambia, en castellano simple, sin marketing vacío).
- [ ] **Migraciones** de datos/documentadas: ¿cambió el esquema de `localStorage`/IndexedDB? → script de migración + prueba de idempotencia.
- [ ] **Rollback** definido: cómo volver a la versión anterior en <5 min (tag previo + cache-name anterior).

## 1 · Puertas automáticas (sin esto no se firma)
- [ ] `node tests/run.mjs` → **24/24 suites** (o el nº que mande la batería) en verde.
- [ ] `node tools/audit-contraste.mjs` → **PASS · 0 pares AA fallando** (CINE y NOCHE).
- [ ] `node tools/audit-paleta.mjs` → **PASS** (negro solo en noche · 0 colores fuera de familia · 0 Google Fonts).
- [ ] `node tools/audit-seguridad.mjs` → **PASS** (0 secretos · 0 innerHTML crudos de datos de usuario).
- [ ] Presupuestos duros (§I): JS inicial ≤ 250 KB · GLB/VRM ≤ 8 MB · first paint ≤ 1 s · CLS < 0.1 · errores de consola = 0.

## 2 · Matriz de regresión (navegador)
- [ ] `verify.sh 1440 900 TAG` y `verify.sh 390 844 TAG` ejecutados.
- [ ] Métricas por viewport: caja `#drawer` (abierto/cerrado) · píxeles de canvas expuestos ·
      `moveTarget` tras clic · delta `camGoalOffset` en arrastre · zoom antes/después · **0 errores de consola**.
- [ ] Capturas fijas auditadas (portada, onboarding, panel abierto/cerrado, torso, sombra) con mimo-omni.

## 3 · Accesibilidad (P18)
- [ ] Recorrido solo-teclado sin atascos (portada, panel, modales, juegos).
- [ ] Foco visible siempre · ARIA correcto (roles, labels, `aria-live`) · `prefers-reduced-motion` global.
- [ ] Contraste AA (lo garantiza `audit-contraste`) · objetivos táctiles ≥ 44 px.

## 4 · Privacidad y GDPR (P11)
- [ ] Vídeo/imagen de cámara **nunca** sale del dispositivo (verificado: 0 peticiones de red en captura).
- [ ] Consentimientos granulares con revocación real y efectos inmediatos.
- [ ] Borrado de cuenta con **acuse** descargable (qué se borró y cuándo).
- [ ] 30/30 diálogos peligrosos → derivación profesional (nunca consejo clínico).

## 5 · Rendimiento y offline (P16)
- [ ] Lighthouse ≥ 95 (rendimiento, accesibilidad, buenas prácticas, SEO) adjunto.
- [ ] Service worker versionado con actualización limpia · offline total.
- [ ] Heap estable 30 min (0 crecimiento) · budgets en CI.

## 6 · Honestidad de producto (anti-slop §H)
- [ ] Sin degradados morados/azules · sin emojis como iconografía principal · sin copy vacío.
- [ ] «Descansar es progreso» verificado en copy · «pagar no compra nivel ni fuerza» verificado en código y copy.
- [ ] Sin métricas inventadas · sin gamificación de casino · sin funciones sociales falsas.

## 7 · Firma
- [ ] Números de cierre rellenados abajo.
- [ ] Decisiones/riesgos abiertos comunicados al humano (§K).
- [ ] Commit/tag de release creado: `release: vX.Y.Z (<resumen>)`.

### Números de cierre (al firmar)
```
Versión ................ v____.__.__
Tests .................. ___/___  suites
Contraste AA ........... ___/___  pares (CINE+NOCHE)
Paleta ................. PASS / FAIL
Seguridad .............. PASS / FAIL · secretos ___ · innerHTML crudos ___
Lighthouse ............. rend ___ · acc ___ · buenas prácticas ___ · SEO ___
Matriz 1440x900 ........ errores consola ___
Matriz 390x844 ......... errores consola ___
Heap 30 min ............ Δ ___ KB
Firma agente ........... _______________  Fecha ________
```
