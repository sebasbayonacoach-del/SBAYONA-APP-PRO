# 📱 BAYONA Mobile (contenedor Capacitor)

Este contenedor empaqueta la app web de BAYONA para **Android** e **iOS** sin reescribir nada.

## Compilar el APK (sin Android Studio)

```bash
# desde la raíz del repo
npm test                 # la batería debe estar en verde
npm run mobile:pack      # empaqueta la web → mobile/web-build/

cd mobile
npm i                    # una vez: Capacitor + plataforma Android
npx cap sync android     # copia la web al proyecto nativo

cd android
export ANDROID_HOME=~/Android/Sdk   # si no está en el entorno
./gradlew assembleDebug             # APK de prueba  → app/build/outputs/apk/debug/
./gradlew assembleRelease           # APK firmado    → app/build/outputs/apk/release/
```

El APK de **release se firma solo**: `android/keystore.properties` apunta al
keystore y la config de firma ya está cableada en `app/build.gradle`.

## Firma (keystore)

- Keystore: `android/bayona-release.keystore` · alias `bayona` (gitignored, **nunca al repo ni compartido por chat**).
- Credenciales: `android/keystore.properties` (gitignored).
- ⚠️ Si pierdes el keystore no podrás actualizar la app en Play Store con el mismo
  paquete (`app.bayona.fit`): haz copia de seguridad de los DOS archivos.

## Cloud desde el APK (coach IA y fotos de receta)

Dentro del contenedor no hay servidor `/api`. La app degrada sin romperse
(coach → modo LOCAL), y cuando haya URL pública basta definir **antes de
`js/main.js`**:

```html
<script>window.BAYONA_API_BASE = "https://tu-dominio.vercel.app";</script>
```

Un solo mando para coach (`/api/coach`) y fotos (`/api/meal-image`).
`window.BAYONA_COACH_ENDPOINT` sigue teniendo prioridad si existe.

## Recursos generados

- Iconos launcher (incl. adaptativos y redondos) y splash día/noche en todas las
  densidades: `android/app/src/main/res/` — regenerar con
  `npx @capacitor/assets generate --android` desde `mobile/` (fuentes en `mobile/assets/`).
- Fondo del icono adaptativo: negro sólido (`drawable/ic_launcher_background.xml`).

## iOS

```bash
cd mobile && npm i @capacitor/ios && npx cap add ios && npx cap open ios
```
→ Xcode (Archive → App Store Connect) — requiere Mac o EAS Build.

**Guía completa de publicación (cuentas, costes, checklists de revisión, timeline):**
→ [`../docs/MOBILE_RELEASE.md`](../docs/MOBILE_RELEASE.md)
