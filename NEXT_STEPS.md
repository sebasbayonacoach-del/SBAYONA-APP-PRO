# BAYONA — SIGUIENTE PASO TÉCNICO (estado real, sin maquillaje)

## El siguiente paso concreto
**Conectar el backend Supabase ya especificado (`api/API_REST.md` + `api/supabase/migrations/`) y enchufar la cola offline a `POST /sessions/:id/sets`** (`makeSender` ya está implementado y testeado: solo falta `window.BAYONA_API = { baseUrl, getToken, getSessionId }` + auth real).

Con eso se desbloquean, en este orden:
1. Sincronización real de series (hoy: persistencia local + cola lista para enviar).
2. Cuentas y sesiones reales (hoy: perfil local único; la arquitectura de auth está pendiente).
3. Validación server-side de códigos phygital por lote (hoy: validación local con formato + dígito de control + uso único + auditoría).
4. Entitlements de membresía reales (hoy: GRATIS/PRO/ÉLITE se muestran como estado honesto, sin facturación).

## Pendientes priorizados
1. **Backend + auth** (bloquea: sync, cuentas, pagos, códigos por lote).
2. **Avatar GLB/VRM**: el avatar actual es procedural (cápsulas/esferas) y se declara fallback técnico; la arquitectura `AvatarProvider` está preparada pero faltan modelos reales.
3. **Comunidad y Tienda**: fuera del slice hasta estabilizar el recorrido principal (botón deshabilitado con explicación, sin falsa experiencia).
4. **Compilar APK/AAB e iOS**: la configuración Capacitor existe (`mobile/`), pero no se ha compilado ni firmado nada — requiere Android SDK/Xcode y credenciales.
5. **Salud conectada** (HealthKit / Health Connect): estados NO CONECTADO honestos; requiere dispositivo + permisos nativos.

## Cómo verificar este estado
```bash
npm test        # 11 suites + golden set
./run.sh        # navegador → flujo: onboarding → entrenar → registrar serie → XP → armario → outfit persiste
# offline: abrir, cortar red, recargar (el shell carga desde el service worker)
```
