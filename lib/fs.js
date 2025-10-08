// lib/fs.js - pseudo filesystem in-memory
import { JOURNEY } from "../data/journey.js";

const FS = {
  "README.txt": "Ketik help untuk daftar command.",
  journey: {
    "index.txt": JOURNEY.map((j) => `${j.range} - ${j.label}`).join("\n"),
  },
  brand: {
    "alias.txt": "Zen",
    "roles.txt": "Linux Enthusiast\nSelf-taught Web Dev\nDigital Forensic Explorer",
    "statement.txt": "Eksperimen adalah cara tercepat paham hal kompleks.",
  },
};
let cwd = "/";

export const getCwd = () => cwd;
export const setCwd = (p) => { cwd = p };

export function pathJoin(base, rel) {
  if (rel.startsWith("/")) return rel;
  return base.endsWith("/") ? base + rel : base + "/" + rel;
}

export function normalize(path) {
  const parts = path.split("/").filter(Boolean);
  const stack = [];
  for (const p of parts) {
    if (p === "..") stack.pop();
    else if (p !== ".") stack.push(p);
  }
  return "/" + stack.join("/");
}

export function getNode(path) {
  if (path === "/") return FS;
  const parts = path.split("/").filter(Boolean);
  let cur = FS;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return undefined;
  }
  return cur;
}

export const isDir = (node) => node && typeof node === "object" && !Array.isArray(node);
export function listDir(path) {
  const node = getNode(path);
  if (!isDir(node)) return "Bukan direktori";
  const entries = Object.keys(node).sort();
  return (
    `<div class="ls-grid">` +
    entries
      .map((e) => isDir(node[e]) ? `<span class='ls-dir tok-dir'>${e}</span>` : `<span>${e}</span>`)
      .join("") + "</div>"
  );
}

export function catFile(path) {
  const node = getNode(path);
  if (node === undefined) return "File tidak ditemukan";
  if (isDir(node)) return "Ini direktori";
  return String(node);
}

export function grepFile(pattern, text) {
  try {
    const r = new RegExp(pattern, "i");
    return text.split("\n").filter((l) => r.test(l)).join("\n");
  } catch {
    return "Pattern regex tidak valid";
  }
}

