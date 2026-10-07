import { strict as assert } from "node:assert";
import {
  TOUR_VERSION, CHECKIN_MOMENTS, coachDisplayName, shouldRunTour,
  shouldOfferCheckinNotifications, normalizedNotificationPreferences,
} from "../js/ui/first-run-tour.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};
console.log("\n🧭 FIRST RUN · TOUR + CHECK-IN\n");

ok(TOUR_VERSION===1,"versión de tour explícita");
ok(CHECKIN_MOMENTS.length===3,"tres momentos opcionales");
ok(coachDisplayName({coachPersona:"sebastian"})==="Sebastián","persona Sebastián");
ok(coachDisplayName({coachPersona:"mara"})==="Mara","persona femenina");
ok(coachDisplayName({coachPersona:"minimal"})==="BAYONA","modo minimal");
ok(!shouldRunTour({onboarded:false},"affiliate"),"sin onboarding no hay tour");
ok(!shouldRunTour({onboarded:true},"coach"),"Coach OS no recibe tour personal");
ok(shouldRunTour({onboarded:true,firstRunTour:{version:0,completed:false}},"affiliate"),"primera entrada sí abre tour");
ok(!shouldRunTour({onboarded:true,firstRunTour:{version:1,completed:true}},"affiliate"),"tour completado no se repite");
ok(!shouldRunTour({onboarded:true,firstRunTour:{version:1,skipped:true}},"affiliate"),"tour saltado no insiste");
ok(shouldOfferCheckinNotifications({onboarded:true,notificationPreferences:{asked:false}}),"primera respuesta puede ofrecer recordatorios");
ok(!shouldOfferCheckinNotifications({onboarded:true,notificationPreferences:{asked:true}}),"no vuelve a insistir");
const p=normalizedNotificationPreferences({morning:true,evening:true});
ok(p.morning&&p.evening&&!p.preTraining&&p.asked,"preferencias normalizadas y marcadas como preguntadas");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
