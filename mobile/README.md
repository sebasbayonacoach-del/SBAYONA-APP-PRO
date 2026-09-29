# 📱 BAYONA Mobile (contenedor Capacitor)

Este contenedor empaqueta la app web de BAYONA para **Android** e **iOS** sin reescribir nada.

## 3 comandos
```bash
npm run mobile:pack     # 1) empaquetar la web → mobile/web-build/
cd mobile               # 2) instalar Capacitor + plataforma (una vez)
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios && npx cap add android && npx cap add ios
npx cap sync            # 3) sincronizar y abrir el IDE
npx cap open android    #    → Android Studio (AAB firmado → Play Console)
npx cap open ios        #    → Xcode (Archive → App Store Connect) — requiere Mac o EAS Build
```

**Guía completa de publicación (cuentas, costes, checklists de revisión, timeline):**
→ [`../docs/MOBILE_RELEASE.md`](../docs/MOBILE_RELEASE.md)
