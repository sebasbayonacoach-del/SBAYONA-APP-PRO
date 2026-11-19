import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../js/ui/auth-gate.js", import.meta.url), "utf8");
let passed = 0;
const ok = (condition, message) => { assert.ok(condition, message); passed++; };

const match = source.match(/const entryRole = ([^;]+);/);
ok(Boolean(match), "se identifica la regla efectiva de entrada");
const choose = (guest, role, verifiedRole) => runInNewContext(
  `(function (guest, role, accountRole) { return ${match[1]}; })`,
  {}
)(guest, role, () => verifiedRole);
ok(choose(false, "coach", "coach") === "coach", "coach verificado entra a Coach Studio");
ok(choose(false, "athlete", "coach") === "affiliate", "coach verificado puede entrar a su APP Atleta");
ok(choose(false, "coach", "athlete") === "affiliate", "atleta no puede forzar Coach Studio");
ok(choose(true, "coach", "coach") === "affiliate", "modo invitado no da acceso coach");
ok(choose(false, "athlete", "athlete") === "affiliate", "atleta abre su espacio personal");
ok(choose(false, null, "coach") === "affiliate", "una elección ausente no abre Coach Studio");

const after = source.match(/async function afterAuthenticated\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
ok(after.includes('const role = await verifyCoachRole()'), "el servidor resuelve el rol autorizado");
ok(after.includes('state.mode = "choose-space"'), "el propietario ve el selector tras login");
ok(!after.includes('await enterProduct({ roleOverride: "coach" })'), "el propietario no entra automáticamente a coach");

const chooser = source.match(/async function chooseSpace\(space\) \{([\s\S]*?)\n\}/)?.[1] || "";
ok(chooser.includes("const permitted = await verifyCoachRole()"), "cada selección revalida permisos");
ok(chooser.includes('if (permitted !== "coach")'), "acceso coach rechazado si no se verificó");
ok(chooser.includes('await enterProduct({ roleOverride: "athlete" })'), "selección atleta abre explícitamente APP Atleta");
ok(chooser.includes('await enterProduct({ roleOverride: "coach" })'), "selección coach abre explícitamente el panel");
ok(chooser.includes("hasUserLocalState(user)") && chooser.includes("portableProfileFromUser(user)"), "atleta recupera progreso cuando existe");
ok(chooser.includes('state.mode = "profile"'), "si falta perfil atleta se abre onboarding");

ok(source.includes('data-auth-space="coach"'), "tarjeta coach disponible para propietario");
ok(source.includes('data-auth-space="athlete"'), "tarjeta atleta disponible para propietario");
ok(source.includes('root?.querySelectorAll("[data-auth-space]")'), "opciones conectadas al controlador");
ok(source.includes('state.mode === "choose-space"'), "selector renderizado en pantalla");
ok(source.includes('accountRole() === "coach" ? "coach" : "affiliate"') === false || source.includes("role === \"coach\" && accountRole()"), "el estado de autorización no se confunde con la elección");

console.log("APP 7.0 Coach/Atleta: " + passed + " checks PASS");
