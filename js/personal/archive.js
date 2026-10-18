// BAYONA · Mi Universo: archivo longitudinal PRIVADO (sin red ni dependencias)
// Nunca incluir perfiles privados en este repositorio público.
export const ARCHIVE_FORMAT = 'bayona-personal-archive';
export const ARCHIVE_VERSION = 1;
export const VAULT_KEY = 'bayona.private-universe.v1';
const MAX_ITEMS = 500;
const PBKDF2_ITERATIONS = 210_000;
const MAX_FILE_BYTES = 2_000_000;

const short = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const slug = (value) => /^[a-z0-9][a-z0-9-]{1,63}$/.test(value);
const toArray = (value, max = MAX_ITEMS) => Array.isArray(value) ? value.slice(0, max) : [];

export function normalizeArchive(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.format !== ARCHIVE_FORMAT || input.version !== ARCHIVE_VERSION) {
    throw new Error('Este archivo no es un archivo privado BAYONA v1.');
  }
  if (!Array.isArray(input.projects) || input.projects.length === 0 || input.projects.length > MAX_ITEMS) {
    throw new Error('El archivo debe contener entre 1 y 500 proyectos.');
  }
  if (input.milestones && (!Array.isArray(input.milestones) || input.milestones.length > MAX_ITEMS)) {
    throw new Error('La cronología supera el límite permitido.');
  }
  const seen = new Set();
  const projects = input.projects.map((p) => {
    if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error('Un proyecto tiene un formato incorrecto.');
    const id = short(p.id, 64), name = short(p.name, 100);
    if (!slug(id) || !name || seen.has(id)) throw new Error('Los proyectos necesitan identificadores válidos y únicos.');
    seen.add(id);
    return { id, name, area: short(p.area, 60), status: short(p.status, 36), since: short(p.since, 20), description: short(p.description, 900), next: short(p.next, 280) };
  });
  const milestones = toArray(input.milestones).map((m) => ({ date: short(m?.date, 12), title: short(m?.title, 100), detail: short(m?.detail, 350), projectId: seen.has(m?.projectId) ? m.projectId : '' })).filter((m) => m.title);
  const principles = toArray(input.principles, 30).map((p) => short(p, 140)).filter(Boolean);
  return { format: ARCHIVE_FORMAT, version: ARCHIVE_VERSION, owner: short(input.owner, 100), updatedAt: short(input.updatedAt, 24), mission: short(input.mission, 300), principles, projects, milestones, note: short(input.note, 400) };
}
export function archiveSummary(archive) {
  return { projects: archive.projects.length, milestones: archive.milestones.length, areas: new Set(archive.projects.map((p) => p.area || 'Otros')).size };
}
export function findProjects(archive, query = '', area = '') {
  const q = short(query, 150).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return archive.projects.filter((p) => (!area || p.area === area) && [p.name,p.description,p.status,p.area,p.next].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(q));
}

function bytesToB64(bytes) {
  let raw = '';
  for (const b of bytes) raw += String.fromCharCode(b);
  return btoa(raw);
}
function b64ToBytes(encoded) {
  if (!encoded || typeof encoded !== 'string' || encoded.length > MAX_FILE_BYTES * 2) throw new Error('Copia cifrada no válida.');
  return Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
}
async function derive(password, salt) {
  if (typeof password !== 'string' || password.length < 12) throw new Error('Utiliza una frase de al menos 12 caracteres.');
  if (!globalThis.crypto?.subtle) throw new Error('Este navegador no admite cifrado seguro.');
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name:'PBKDF2', hash:'SHA-256', salt, iterations:PBKDF2_ITERATIONS }, material, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
}
export async function encryptArchive(input, password) {
  const data = normalizeArchive(input);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(password, salt);
  const content = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv},key,content);
  return { format:'bayona-private-vault', version:1, kdf:'PBKDF2-SHA256', iterations:PBKDF2_ITERATIONS, algorithm:'AES-256-GCM', salt:bytesToB64(salt), iv:bytesToB64(iv), ciphertext:bytesToB64(new Uint8Array(ciphertext)) };
}
export async function decryptArchive(vault, password) {
  if (!vault || vault.format!=='bayona-private-vault' || vault.version!==1 || vault.iterations!==PBKDF2_ITERATIONS || vault.algorithm!=='AES-256-GCM') throw new Error('Bóveda incompatible o dañada.');
  try {
    const salt=b64ToBytes(vault.salt), iv=b64ToBytes(vault.iv);
    if(salt.length!==16 || iv.length!==12) throw new Error('Formato de cifrado incorrecto.');
    const key=await derive(password,salt);
    const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,b64ToBytes(vault.ciphertext));
    return normalizeArchive(JSON.parse(new TextDecoder().decode(bytes)));
  } catch { throw new Error('Frase incorrecta o copia de datos dañada.'); }
}
export function validateFileSize(bytes) {
  if(!Number.isFinite(bytes) || bytes<=0 || bytes>MAX_FILE_BYTES) throw new Error('Selecciona un JSON de hasta 2 MB.');
  return true;
}