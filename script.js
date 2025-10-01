import { JOURNEY } from "./data/journey.js";
import { getCwd, getNode, isDir } from "./lib/fs.js";
import { buildCommands } from "./lib/commands.js";
import { createAutocomplete } from "./lib/autocomplete.js";

const appEl = document.getElementById("app");
const consoleOut = document.getElementById("console-output");
const consoleForm = document.getElementById("console-form");
const consoleInput = document.getElementById("console-input");
const inputMirror = document.getElementById("input-mirror");
const promptSpan = document.getElementById("console-prompt");
const timelineContent = document.getElementById("timeline-content");
const yearTabs = document.getElementById("year-tabs");
const themeSwitcher = document.getElementById("theme-switcher");
const yearSpan = document.getElementById("year");
const introEl = document.querySelector(".terminal-intro");

yearSpan.textContent = new Date().getFullYear();

function writeLine(text = "", cls = "", html = false) {
  const div = document.createElement("div");
  div.className = "line" + (cls ? " " + cls : "");
  if (html) div.innerHTML = text;
  else div.textContent = text;
  consoleOut.appendChild(div);
  consoleOut.scrollTop = consoleOut.scrollHeight;
}
function clearConsole() {
  consoleOut.innerHTML = "";
}

function setTheme(name) {
  const allowed = ["ubuntu", "cachyos", "fedora", "gentoo", "void"];
  if (!allowed.includes(name)) return "Tema tidak ditemukan";
  document.documentElement.dataset.theme = name;
  [...themeSwitcher.querySelectorAll("button")].forEach((b) =>
    b.classList.toggle("active", b.dataset.theme === name)
  );
  return "Tema diganti → " + name;
}

// Build theme buttons
["ubuntu", "cachyos", "fedora", "gentoo", "void"].forEach((t) => {
  const btn = document.createElement("button");
  btn.textContent = t;
  btn.dataset.theme = t;
  if (document.documentElement.dataset.theme === t) btn.classList.add("active");
  btn.addEventListener("click", () => {
    writeLine(setTheme(t));
  });
  themeSwitcher.appendChild(btn);
});

// Build timeline tabs
JOURNEY.forEach((j, idx) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.role = "tab";
  btn.ariaSelected = idx === 0 ? "true" : "false";
  btn.textContent = j.range;
  btn.addEventListener("click", () => selectRange(j.range));
  yearTabs.appendChild(btn);
});

function selectRange(range) {
  [...yearTabs.children].forEach((b) =>
    b.setAttribute("aria-selected", b.textContent === range ? "true" : "false")
  );
  const found = JOURNEY.find((j) => j.range === range) || JOURNEY[0];
  renderEntries(found);
}

function renderEntries(group) {
  timelineContent.innerHTML = "";
  const entry = document.createElement("div");
  entry.className = "entry";
  const h = document.createElement("h3");
  h.textContent = `${group.range} — ${group.label}`;
  entry.appendChild(h);
  const ul = document.createElement("ul");
  group.points.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p;
    ul.appendChild(li);
  });
  entry.appendChild(ul);
  timelineContent.appendChild(entry);
}

selectRange(JOURNEY[0].range);

// ===== Pseudo Filesystem handled by lib/fs.js =====
// cwd & helpers diimport

// ===== Command Implementations (extended) =====
const HISTORY = [];
let historyIndex = -1;

function colorizePrompt() {
  const host = "zenos";
  const user = "zen";
  const cwd = getCwd();
  const shortPath =
    cwd === "/"
      ? "~"
      : cwd
          .replace(/\/+/g, "/")
          .replace(/^\/+/, "")
          .split("/")
          .slice(-2)
          .join("/") || "/";
  promptSpan.innerHTML = `<span class="tok-cmd">${user}</span>@<span class="tok-sys">${host}</span>:<span class="prompt-path">${shortPath}</span>$`;
}
colorizePrompt();

// Build COMMANDS via factory
const COMMANDS = buildCommands({ colorizePrompt, HISTORY, setTheme });

// Pipeline executor
async function execute(raw) {
  const segments = raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  let input = "";
  for (const seg of segments) {
    const [cmd, ...rest] = seg.split(/\s+/);
    const arg = rest.join(" ");
    const handler = COMMANDS[cmd];
    if (!handler) {
      return "Command tidak dikenal: " + cmd;
    }
    let out;
    try {
      out = handler.action(arg, { clear: clearConsole, setTheme });
    } catch (err) {
      out = "Error: " + err.message;
    }
    if (typeof out === "object" && out && out.html) {
      // Hilangkan HTML bila diteruskan ke command selain terakhir agar aman
      const isLast = seg === segments[segments.length - 1];
      input = isLast ? out.html : out.html.replace(/<[^>]+>/g, " ");
    } else input = String(out || "");
  }
  return input;
}

function renderUserInput(raw) {
  const tokens = raw.split(/\s+/);
  if (!tokens[0]) return "";
  return (
    `<span class="tok-cmd">${tokens[0]}</span>` +
    tokens
      .slice(1)
      .map((t) => {
        if (t.startsWith("-")) return ` <span class="tok-arg">${t}</span>`;
        if (t.includes("/") || t.includes("."))
          return ` <span class="tok-path">${t}</span>`;
        return ` <span>${t}</span>`;
      })
      .join("")
  );
}

inputMirror.textContent = "";
consoleInput.addEventListener("input", () => {
  updateMirrorWithSuggestion();
});

// ===== Autocomplete instance =====
const AC = createAutocomplete({
  inputEl: consoleInput,
  mirrorEl: inputMirror,
  writeLine,
  COMMANDS,
  getCwd,
  fsApi: { getNode, isDir }
});

// re-expose for potential debug (optional)
const applyAutocomplete = () => AC.applyAutocomplete();
const updateMirrorWithSuggestion = () => AC.updateMirrorWithSuggestion();

// Tab key integration
consoleForm.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    applyAutocomplete();
    updateMirrorWithSuggestion();
  }
});

// History navigation
consoleForm.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") {
    if (HISTORY.length) {
      historyIndex = historyIndex <= 0 ? 0 : historyIndex - 1;
      consoleInput.value = HISTORY[historyIndex];
      inputMirror.innerHTML = renderUserInput(consoleInput.value);
      e.preventDefault();
    }
  }
  if (e.key === "ArrowDown") {
    if (HISTORY.length) {
      historyIndex =
        historyIndex >= HISTORY.length - 1
          ? HISTORY.length - 1
          : historyIndex + 1;
      consoleInput.value = HISTORY[historyIndex];
      inputMirror.innerHTML = renderUserInput(consoleInput.value);
      e.preventDefault();
    }
  }
});

// Focus handling (click mirror area)
document
  .querySelector(".input-wrap")
  .addEventListener("click", () => consoleInput.focus());

consoleForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const raw = consoleInput.value.trim();
  if (!raw) return;
  HISTORY.push(raw);
  historyIndex = HISTORY.length;
  const renderedInput = renderUserInput(raw) || raw;
  const ps1 = promptSpan.innerHTML;
  writeLine(
    `<span class="ps1">${ps1}</span> <span class="command">${renderedInput}</span>`,
    "promptline",
    true
  );
  const result = await execute(raw);
  if (result) {
    if (result.startsWith("<div") || result.includes("ls-grid"))
      writeLine(result, "", true);
    else {
      const processed = result.replace(
        /(\b20\d{2}(?:-|→)(?:20)?\d{2}\b)/g,
        '<span class="tok-range">$1</span>'
      );
      processed.split("\n").forEach((l) => writeLine(l, "", true));
    }
  }
  consoleInput.value = "";
  inputMirror.textContent = "";
});

// Keyboard timeline quick nav (Alt+Arrow)
window.addEventListener("keydown", (e) => {
  if (e.altKey && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
    const btns = [...yearTabs.children];
    const idx = btns.findIndex(
      (b) => b.getAttribute("aria-selected") === "true"
    );
    const next =
      e.key === "ArrowRight"
        ? (idx + 1) % btns.length
        : (idx - 1 + btns.length) % btns.length;
    selectRange(btns[next].textContent);
  }
});

// Auto intro sequence then reveal app
// === Boot progress simulation ===
(async () => {
  const phases = [
    { label: "Init core", delay: 220 },
    { label: "Load modules", delay: 300 },
    { label: "Mount /dev/zen", delay: 260 },
    { label: "Scan journey timeline", delay: 340 },
    { label: "Apply themes", delay: 240 },
    { label: "Spawn shell", delay: 280 },
  ];
  let progress = 0;
  function renderBar(p, msg) {
    const width = 24;
    const filled = Math.round((p / 100) * width);
    const bar = "[" + "#".repeat(filled) + "-".repeat(width - filled) + "]";
    introEl.textContent = `${bar} ${p.toString().padStart(3, " ")}%\n${msg}`;
  }
  for (let i = 0; i < phases.length; i++) {
    progress = Math.min(100, Math.round(((i + 1) / phases.length) * 100));
    renderBar(progress, phases[i].label + " …");
    await new Promise((r) =>
      setTimeout(r, phases[i].delay + Math.random() * 180)
    );
  }
  introEl.textContent =
    '[########################] 100%\nREADY → ketik "banner" atau "help"';
  appEl.hidden = false;
  writeLine("Boot selesai. Jalankan perintah: banner | help");
})();
