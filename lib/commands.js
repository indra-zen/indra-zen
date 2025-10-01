// lib/commands.js - build command registry
import { catFile, listDir, normalize, pathJoin, getCwd, setCwd, getNode, isDir, grepFile } from "./fs.js";
import { startMatrix, stopMatrix, showPanic } from "./modes.js";
import { JOURNEY, BRAND } from "../data/journey.js";
import { $create } from "./helpers.js";

export function buildCommands({ colorizePrompt, HISTORY, setTheme }) {
  const COMMANDS = {
    help: {
      desc: "Daftar command",
      action: () => Object.keys(COMMANDS).join("  "),
    },
    about: {
      desc: "Info singkat brand",
      action: () => `${BRAND.alias} = ${BRAND.name}\n${BRAND.roles.join(" | ")}`,
    },
    brand: {
      desc: "Brand DNA ringkas",
      action: () => "Linux-first, Eksploratif, Mandiri, Persisten, Curious",
    },
    journey: {
      desc: "List rentang waktu",
      action: () => JOURNEY.map((j) => j.range + " :: " + j.label).join("\n"),
    },
    open: {
      desc: "Detail rentang (usage: open <range>)",
      action: (arg) => {
        const j = JOURNEY.find((j) => j.range === arg);
        return j
          ? "[" + j.range + "] " + j.label + "\n- " + j.points.join("\n- ")
          : "Rentang tidak ditemukan";
      },
    },
    clear: {
      desc: "Bersihkan layar",
      action: (arg, { clear }) => {
        clear();
        return "cleared.";
      },
    },
    theme: {
      desc: "Ganti tema (usage: theme ubuntu|cachyos|fedora|gentoo|void)",
      action: (arg, ctx) => ctx.setTheme(arg),
    },
    echo: { desc: "Print teks", action: (arg) => arg || "" },
    ls: { desc: "List file", action: () => ({ html: listDir(getCwd()) }) },
    pwd: { desc: "Tampilkan path", action: () => getCwd() },
    cd: {
      desc: "Ganti direktori",
      action: (arg) => {
        if (!arg) {
          setCwd("/");
          colorizePrompt();
          return getCwd();
        }
        const target = normalize(pathJoin(getCwd(), arg));
        const node = getNode(target);
        if (node && isDir(node)) {
          setCwd(target);
          colorizePrompt();
          return "";
        }
        return "Direktori tidak ditemukan";
      },
    },
    cat: {
      desc: "Lihat isi file",
      action: (arg) => {
        if (!arg) return "Butuh nama file";
        return catFile(normalize(pathJoin(getCwd(), arg)));
      },
    },
    history: {
      desc: "Riwayat command",
      action: () => HISTORY.map((h, i) => `${i + 1}  ${h}`).join("\n"),
    },
    grep: {
      desc: "Filter teks: usage grep pattern file",
      action: (arg) => {
        const [pattern, file] = arg.split(/\s+/);
        if (!pattern || !file) return "Usage: grep pattern file";
        const content = catFile(normalize(pathJoin(getCwd(), file)));
        if (/File tidak ditemukan|Ini direktori/.test(content)) return content;
        const res = grepFile(pattern, content);
        return res || "(no match)";
      },
    },
    whoami: { desc: "User saat ini", action: () => "zen" },
    date: { desc: "Tanggal sekarang", action: () => new Date().toString() },
    alias: { desc: "Alias contoh", action: () => "Belum ada alias custom." },
    banner: {
      desc: "Tampilkan ASCII banner (usage: banner [zen|full])",
      action: (arg) => {
        const bannerZen = () =>
          [
            "███████╗ ███████╗ ███╗   ██╗",
            "╚══███╔╝ ██╔════╝ ████╗  ██║",
            "  ███╔╝  █████╗   ██╔██╗ ██║",
            " ███╔╝   ██╔══╝   ██║╚██╗██║",
            "███████╗ ███████╗ ██║ ╚████║",
            "╚══════╝ ╚══════╝ ╚═╝  ╚═══╝",
          ].join("\n");
        const bannerFull = () =>
          [
            'Indra "Zen" Pranata',
            "────────────────────",
            "Linux · Web Dev · Forensic Explorer",
          ].join("\n");
        const mode = (arg || "zen").toLowerCase();
        const art = mode === "full" ? bannerFull() : bannerZen();
        return { html: `<pre class="ascii-banner">${art}</pre>` };
      },
    },
    mode: {
      desc: "Atur mode visual (usage: mode matrix|normal)",
      action: (arg) => {
        if (arg === "matrix") return startMatrix();
        if (arg === "normal") return stopMatrix();
        return "Usage: mode matrix|normal";
      },
    },
    display: {
      desc: "Display style (usage: display crt|normal)",
      action: (arg) => {
        if (arg === "crt") {
          document.body.classList.add("crt");
          return "CRT mode ON";
        }
        if (arg === "normal") {
          document.body.classList.remove("crt");
          return "CRT mode OFF";
        }
        return "Usage: display crt|normal";
      },
    },
    present: {
      desc: "Present mode (usage: present on|off)",
      action: (arg) => {
        if (arg === "on") {
          document.body.classList.add("present");
          return "Present mode ON";
        }
        if (arg === "off") {
          document.body.classList.remove("present");
          return "Present mode OFF";
        }
        return "Usage: present on|off";
      },
    },
    panic: { desc: "Trigger fake kernel panic", action: () => showPanic() },
    export: {
      desc: "Export data (usage: export journey)",
      action: (arg) => {
        if (arg !== "journey") return "Usage: export journey";
        const blob = new Blob([JSON.stringify(JOURNEY, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = $create("a");
        a.href = url;
        a.download = "journey.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        return "Journey diekspor (journey.json)";
      },
    },
  };

  // Override help untuk output terformat + jumlah total
  COMMANDS.help.action = () => {
    const keys = Object.keys(COMMANDS).sort();
    return (
      keys
        .map((k) => k.padEnd(10, " ") + " - " + (COMMANDS[k].desc || ""))
        .join("\n") + `\nTotal: ${keys.length} command`
    );
  };

  return COMMANDS;
}
