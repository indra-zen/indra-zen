// lib/modes.js - Visual modes (matrix, panic overlay)
let matrixCanvas,
  matrixCtx,
  matrixCols = [],
  matrixAnimId;

function onResizeMatrix() {
  if (!matrixCanvas) return;
  matrixCanvas.width = window.innerWidth;
  matrixCanvas.height = window.innerHeight;
  const cols = Math.floor(matrixCanvas.width / 14);
  matrixCols = new Array(cols)
    .fill(0)
    .map(() => Math.random() * matrixCanvas.height);
}
function drawMatrix() {
  matrixCtx.fillStyle = "rgba(0,0,0,0.15)";
  matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
  const chars = "01ZEN<>/{}[]=+*";
  matrixCtx.font = "14px JetBrains Mono, monospace";
  for (let i = 0; i < matrixCols.length; i++) {
    const x = i * 14;
    const y = matrixCols[i];
    const ch = chars[Math.floor(Math.random() * chars.length)];
    matrixCtx.fillStyle = `hsl(${(Date.now() / 40 + i * 7) % 360} 80% 60%)`;
    matrixCtx.fillText(ch, x, y);
    matrixCols[i] =
      y > matrixCanvas.height + Math.random() * 200
        ? 0
        : y + 16 + Math.random() * 6;
  }
  matrixAnimId = requestAnimationFrame(drawMatrix);
}
export function startMatrix() {
  if (!matrixCanvas) {
    matrixCanvas = document.createElement("canvas");
    matrixCanvas.className = "matrix-canvas";
    document.body.appendChild(matrixCanvas);
    matrixCtx = matrixCanvas.getContext("2d");
    onResizeMatrix();
    window.addEventListener("resize", onResizeMatrix);
  }
  if (!matrixAnimId) drawMatrix();
  if (!document.body.classList.contains("matrix"))
    document.body.classList.add("matrix");
  return "Matrix mode ON";
}
export function stopMatrix() {
  document.body.classList.remove("matrix");
  if (matrixAnimId) cancelAnimationFrame(matrixAnimId);
  matrixAnimId = null;
  if (matrixCanvas)
    matrixCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
  return "Matrix mode OFF";
}

// Panic overlay
let panicEl = null;
function buildPanic() {
  const log = [
    "*** Kernel Panic - ZenOS 0.1 ***",
    "Fatal: inconsistent mindset state detected",
    "Trace: curiosity -> experiment -> failure -> iterate -> growth",
    "Hint: Keep exploring. Exit with ESC.",
    "",
    "Registers:",
    " R1 = linux",
    " R2 = webdev",
    " R3 = forensic",
    " R4 = persistence",
    "",
    "Stack (top 6):",
    " 0x01 experiment()",
    " 0x02 debug()",
    " 0x03 refactor()",
    " 0x04 document()",
    " 0x05 present()",
    " 0x06 learn()",
  ].join("\n");
  const div = document.createElement("div");
  div.className = "panic-overlay";
  div.innerHTML = `<div class="title">ZenOS Kernel Panic</div><pre>${log}</pre><div class="hint">Press ESC to resume</div>`;
  return div;
}
export function showPanic() {
  if (panicEl) return "Panic already active";
  panicEl = buildPanic();
  document.body.appendChild(panicEl);
  const esc = (e) => {
    if (e.key === "Escape") {
      hidePanic();
      window.removeEventListener("keydown", esc);
    }
  };
  window.addEventListener("keydown", esc);
  return "Kernel panic triggered";
}
export function hidePanic() {
  if (panicEl) {
    panicEl.remove();
    panicEl = null;
    return "Recovered from panic";
  }
  return "No panic active";
}
