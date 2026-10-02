import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const expected = readFileSync(resolve(root, "VERSION"), "utf8").trim();
const packageVersion = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;
const packageLockVersion = JSON.parse(readFileSync(resolve(root, "package-lock.json"), "utf8")).version;
const tauriVersion = JSON.parse(readFileSync(resolve(root, "src-tauri", "tauri.conf.json"), "utf8")).version;
const cargoText = readFileSync(resolve(root, "src-tauri", "Cargo.toml"), "utf8");
const cargoVersion = cargoText.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const cargoLockText = readFileSync(resolve(root, "src-tauri", "Cargo.lock"), "utf8");
const cargoLockVersion = cargoLockText.match(/name\s*=\s*"api-studio"\s*\nversion\s*=\s*"([^"]+)"/)?.[1];

const versions = {
  VERSION: expected,
  "package.json": packageVersion,
  "package-lock.json": packageLockVersion,
  "tauri.conf.json": tauriVersion,
  "Cargo.toml": cargoVersion,
  "Cargo.lock": cargoLockVersion,
};

const mismatches = Object.entries(versions).filter(([, version]) => version !== expected);
if (mismatches.length) {
  console.error("Las versiones del proyecto no coinciden:");
  for (const [file, version] of Object.entries(versions)) console.error(`- ${file}: ${version ?? "no encontrada"}`);
  process.exit(1);
}

console.log(`Versiones sincronizadas: v${expected}`);
