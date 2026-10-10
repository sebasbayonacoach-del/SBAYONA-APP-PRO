import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const home = homedir();
const mobile = resolve(root, "mobile");
const android = resolve(mobile, "android");
const apk = resolve(android, "app/build/outputs/apk/debug/app-debug.apk");
const outDir = resolve(home, "Descargas/BAYONA");
const outApk = resolve(outDir, "BAYONA-Android-latest-beta.apk");

function bin(...candidates) {
  return candidates.find((p) => p && existsSync(p)) || candidates[candidates.length - 1];
}

const adb = bin(
  process.env.ADB,
  process.env.ANDROID_HOME && resolve(process.env.ANDROID_HOME, "platform-tools/adb"),
  process.env.ANDROID_SDK_ROOT && resolve(process.env.ANDROID_SDK_ROOT, "platform-tools/adb"),
  resolve(home, "Android/Sdk/platform-tools/adb"),
  "adb",
);

function run(command, args = [], options = {}) {
  console.log("\n› " + command + " " + args.join(" "));
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    stdio: "inherit",
    env: options.env || process.env,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Falló: " + command + " " + args.join(" "));
}

function capture(command, args = [], options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd || root,
    encoding: "utf8",
    env: options.env || process.env,
  }).trim();
}

function javaHome() {
  const candidates = [
    process.env.JAVA_HOME,
    resolve(home, "jdk-21"),
    "/usr/lib/jvm/java-21-openjdk-amd64",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(resolve(candidate, "bin/java"))) return candidate;
  }

  try {
    const java = capture("which", ["java"]);
    if (java) {
      const real = capture("readlink", ["-f", java]);
      return resolve(real, "../..");
    }
  } catch {}

  return process.env.JAVA_HOME || "";
}

console.log("\nBAYONA · ACTUALIZACIÓN RÁPIDA AL MÓVIL");
console.log("Preserva los datos de la app usando adb install -r.\n");

const devices = capture(adb, ["devices"])
  .split("\n")
  .slice(1)
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((line) => /\tdevice$/.test(line));

if (!devices.length) {
  throw new Error(
    "No hay un Android autorizado por ADB. Conecta el móvil por USB o activa Depuración inalámbrica y vuelve a ejecutar npm run phone:update.",
  );
}

console.log("✓ Android detectado: " + devices[0].split("\t")[0]);

run(process.execPath, ["tools/sync-shop-catalog.mjs"]);
run(process.execPath, ["tests/commerce-eval.mjs"]);
run("npm", ["run", "mobile:pack"]);
run("npx", ["cap", "sync", "android"], { cwd: mobile });

const jh = javaHome();
if (!jh) throw new Error("No se encontró un JDK válido para Gradle.");
const gradleEnv = {
  ...process.env,
  JAVA_HOME: jh,
  PATH: resolve(jh, "bin") + ":" + process.env.PATH,
};

run("./gradlew", ["assembleDebug"], { cwd: android, env: gradleEnv });

if (!existsSync(apk)) throw new Error("No se generó el APK esperado: " + apk);

mkdirSync(outDir, { recursive: true });
copyFileSync(apk, outApk);
console.log("✓ APK: " + outApk);

run(adb, ["install", "-r", apk]);
run(adb, ["shell", "am", "force-stop", "app.bayona.fit"]);
run(adb, [
  "shell",
  "monkey",
  "-p",
  "app.bayona.fit",
  "-c",
  "android.intent.category.LAUNCHER",
  "1",
]);

let version = "";
try {
  version = capture(adb, ["shell", "dumpsys", "package", "app.bayona.fit"])
    .split("\n")
    .filter((line) => /versionCode=|versionName=/.test(line))
    .slice(0, 2)
    .map((line) => line.trim())
    .join(" · ");
} catch {}

console.log("\n✓ BAYONA actualizada en el móvil sin borrar tus datos.");
if (version) console.log("✓ " + version);
console.log("✓ La app quedó abierta y lista para probar.\n");
