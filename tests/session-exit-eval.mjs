import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {exitActionLabel,exitBayona,loginEntryUrl} from "../js/ui/session-exit.js";
assert.equal(exitActionLabel(true),"Cerrar sesión");
assert.equal(exitActionLabel(false),"Iniciar sesión");
assert.equal(loginEntryUrl({href:"http://127.0.0.1:8094/?go=coach&source=web&lifeRpg=1#access_token=dummy"}),
 "http://127.0.0.1:8094/?source=pwa");
assert.equal(loginEntryUrl({href:"https://bayona-app-one.vercel.app/?source=pwa&foo=bar&auth_state=old#token"}),
 "https://bayona-app-one.vercel.app/?source=pwa&foo=bar");
assert.equal(loginEntryUrl({href:"capacitor://localhost/?source=pwa"}),"capacitor://localhost/?source=pwa");
let saved=0, loggedOut=0, asked=0, redirected=[];
let args={hasSession:()=>true,ask:()=>{asked++;return true},save:()=>{saved++;return true},
 logout:async()=>{loggedOut++},navigate:url=>redirected.push(url),locationLike:{href:"http://127.0.0.1:8094/?go=hoy"}};
assert.equal(await exitBayona(args),true);
assert.equal(saved,1);
assert.equal(loggedOut,1);
assert.equal(asked,1);
assert.deepEqual(redirected,["http://127.0.0.1:8094/?source=pwa"]);
const no={...args,ask:()=>false};
assert.equal(await exitBayona(no),false);
assert.equal(loggedOut,1);
const bad={...args,save:()=>false};
const oldAlert=globalThis.alert;
globalThis.alert=()=>{};
try{assert.equal(await exitBayona(bad),false);}finally{globalThis.alert=oldAlert;}
assert.equal(loggedOut,1);
const guest={...args,hasSession:()=>false,ask:()=>{throw Error("guest need not confirm")},save:()=>{throw Error("guest no save")},logout:()=>{throw Error("guest no logout")}};
assert.equal(await exitBayona(guest),true);
assert.equal(loggedOut,1);
const source=readFileSync(new URL("../js/ui/session-exit.js",import.meta.url),"utf8");
const main=readFileSync(new URL("../js/main.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../css/life-rpg.css",import.meta.url),"utf8");
const sw=readFileSync(new URL("../sw.js",import.meta.url),"utf8");
assert.match(source,/one-role-coach-nav/);
assert.match(source,/data-session-exit/);
assert.match(source,/await logout\(\)/);
assert.doesNotMatch(source,/clearActiveUserData|localStorage\.clear|\\.removeItem\("bayona.save/);
assert.match(main,/installSessionExit\(\);/);
assert.match(css,/bayona-session-exit/);
assert.match(sw,/js\/ui\/session-exit\.js/);
console.log("BAYONA logout: 23 checks PASS");
