# 🎯 BAYONA — CHECKLIST: de BETA a v1.0 PLENA

> Estado real hoy: **beta técnica sólida** (120 tests + golden 100%, app boot sin errores).
> Para ser "plena" (tiendas + backend vivo + gemelo real) faltan estas piezas.

## 🧑‍💻 LO QUE NECESITO DE TI (≈30 min de tu tiempo + decisiones)

| # | Qué | Por qué | Coste |
|---|-----|---------|-------|
| 1 | **Cuenta Supabase** (creas en supabase.com y me pasas el *project url + anon key*) | Ejecutar el SQL de 12 tablas + RLS y que la cola offline fluya de verdad | Gratis (plan free) |
| 2 | **Cuenta Google Play Console** | Publicar Android (obligan test de 12 testers / 14 días) | $25 una vez |
| 3 | **Cuenta Apple Developer** | Publicar iPhone | $99/año |
| 4 | **Dominio** (ej. bayona.fit) para la política de privacidad | Ambas tiendas exigen URL pública de privacidad | ~$10/año |
| 5 | **Un iPhone y un Android gama media** para QA real (TestFlight + test cerrado) | Lo de la cámara se prueba con cuerpos y luces reales | prestados vale |
| 6 | **Decisiones de marca:** nombre final (¿BAYONA?), paleta naranja actual sí/no, icono | Assets de tienda + identidad | 5 min de feedback |
| 7 | **Tus fotos/video de prueba** para el spike del avatar real (360° + 5 caras) | Decidir proveedor de avatar con TU cuerpo de referencia | 10 min grabando |
| 8 | Wearable opcional (Apple Watch / Garmin / báscula) | Integración real de datos de salud | si ya tienes |

## 🛠️ LO QUE CONSTRUYO YO (roadmap de la fase plena)

| # | Pieza | Hoy | Para v1.0 | Esfuerzo |
|---|-------|-----|-----------|----------|
| 1 | **Backend vivo** (Supabase: auth, tablas, RLS, signed URLs) | SQL listo ✅ | desplegado + cola offline sincronizando | 1-2 días |
| 2 | **Onboarding completo** (nombre, objetivo, medidas, PAR-Q+, consentimientos) | piezas sueltas ✅ | flujo único guiado con voz | 2-3 días |
| 3 | **Avatar real (BAYONA Scan)** | rig procedural ✅ | SDK selfie (in3D/Avaturn/RPM) elegido por scorecard | 1-2 semanas |
| 4 | **Coach IA conectado** | núcleo clínico + tools ✅ | LLM + RAG (ACSM/NSCA/OMS) + SSE | 1-2 semanas |
| 5 | **Catálogo de ejercicios completo** | 12 con vídeo ✅ | 35-50 con cues y ROM targets | 1 semana |
| 6 | **Planes por perfil** (fuerza / principiante / vuelta a entrenar) | macrociclo único ✅ | 3 macrociclos + auto-regulación | 3-5 días |
| 7 | **Wearables** (HealthKit / Health Connect) | contratos API ✅ | sync real de pasos/sueño/HRV | 1 semana |
| 8 | **Store assets** (iconos 512/1024, screenshots, copy sin promesas médicas) | screenshots parciales ✅ | pack completo ambos stores | 2-3 días |
| 9 | **Política de privacidad + Data safety** | PRIVACY_CENTER spec ✅ | publicada en tu dominio | 1 día |
| 10 | **QA con humanos** (12 testers Android 14 días + TestFlight) | 0 personas ❌ | beta pública completada | 2-3 semanas |
| 11 | App nativa compilada (Capacitor) en ambos stores | kit listo ✅ | aprobada y publicada | 1-2 semanas de revisión |

## 📅 PLAN DE BATALLA (si arrancamos esta semana)

- **Semana 1:** tu parte (#1-#4) + backend vivo + onboarding completo → **beta cerrada con amigos**
- **Semana 2-3:** avatar real + coach IA + catálogo → **beta con 12 testers (arranca el reloj de Google)**
- **Semana 4-5:** store assets + privacidad publicada + QA → **envío a tiendas**
- **Semana 6-8:** revisiones + fixes → **v1.0 PLENA en Play Store y App Store** 🚀

## ✅ REGLAS QUE NO SE TOCAN PARA "PLENA"
1. Cero promesas médicas: "detecta, programa, acompaña y deriva".
2. Cero frames fuera del dispositivo.
3. Progresar sin pagar. Siempre.
