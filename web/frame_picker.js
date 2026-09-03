import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const CSS = `
.fp-card, .fp-card * { box-sizing: border-box; }
.fp-card {
  --card: transparent;
  --card-2: #191921;
  --line: rgba(255,255,255,0.06);
  --line-strong: rgba(255,255,255,0.10);
  --text: #e8e8ee;
  --muted: #7a7a86;
  --muted-2: #52525c;
  --accent: #f5c542;
  background: var(--card);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif;
  font-size: 12px;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
  /* uniform horizontal inset — every row aligns to the preview's edges */
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
/* preview shape is driven by --fp-aspect (default 16:9, updated to match
   loaded media). The card auto-fits — no letterbox bars, no wasted space. */
.fp-preview   { flex: 0 0 auto; }
.fp-head      { flex: 0 0 auto; }
.fp-transport { flex: 0 0 auto; }
.fp-strip-wrap{ flex: 0 0 auto; }
.fp-readout   { flex: 0 0 auto; }

/* ---------- preview area: aspect-ratio driven ---------- */
.fp-preview {
  position: relative;
  width: 100%;
  aspect-ratio: var(--fp-aspect, 16 / 9);
  background: #2a2a32;
  border-bottom: 1px solid var(--line);
  overflow: hidden;
  display: grid;
  place-items: center;
  transition: background 0.15s;
}
.fp-preview.empty { cursor: pointer; }
.fp-preview.empty::before {
  content: "double-click to load video";
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  opacity: 0.7;
  pointer-events: none;
}
.fp-preview.empty:hover { background: #33333c; }
.fp-preview.empty:hover::before { opacity: 1; color: var(--text); }
.fp-preview:not(.empty) { background: #000; }
.fp-preview.drop-hover {
  background: rgba(245,197,66,0.14) !important;
  box-shadow: inset 0 0 0 2px var(--accent);
}
/* ✕ clear button — visible only when media is loaded */
.fp-clear {
  position: absolute;
  top: 6px; right: 6px;
  width: 22px; height: 22px;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  z-index: 5;
  opacity: 0;
  transition: opacity 0.12s, background 0.12s;
}
.fp-preview:not(.empty) .fp-clear { display: flex; }
.fp-preview:hover .fp-clear { opacity: 0.9; }
.fp-clear:hover { opacity: 1 !important; background: rgba(0,0,0,0.75); }

/* media fills the preview — preview IS the aspect, so no letterbox */
.fp-media-frame {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
  display: none;
}
.fp-preview:not(.empty) .fp-media-frame { display: block; }
.fp-media-frame video, .fp-media-frame img {
  width: 100%;
  height: 100%;
  object-fit: fill; /* preview matches aspect, fill is safe */
  display: block;
  user-select: none;
  -webkit-user-drag: none;
}

/* ---------- meta header: dimensions / fps / frames, left-aligned ---------- */
.fp-head {
  position: relative;
  padding: 10px 0 8px;
  background: linear-gradient(180deg, #0f0f14 0%, #14141a 100%);
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 10px;
}
.fp-frame {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--text);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  outline: none;
  padding: 2px 4px;
  border-radius: 4px;
  cursor: text;
  transition: background 0.15s;
  min-width: 40px;
}
.fp-frame:hover  { background: rgba(255,255,255,0.04); }
.fp-frame:focus  { background: rgba(245,197,66,0.10); }
.fp-frame-label {
  font-size: 9px;
  letter-spacing: 0.22em;
  font-weight: 700;
  color: var(--muted-2);
  text-transform: uppercase;
}
.fp-meta {
  font-size: 9px;
  letter-spacing: 0.14em;
  color: var(--muted-2);
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
}
.fp-meta b { color: var(--muted); font-weight: 700; }

/* ---------- transport row: left-aligned play controls + right-aligned mode toggle ---------- */
.fp-transport {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  padding: 8px 0 4px;
}
.fp-transport .fp-mode-btn { margin-right: 6px; }
.fp-mode-btn {
  min-width: 62px;
  height: 22px;
  padding: 0 10px;
  font-size: 9px;
  letter-spacing: 0.18em;
}
.fp-card.single-mode .fp-mode-btn {
  color: var(--accent);
  border-color: rgba(245,197,66,0.35);
  background: rgba(245,197,66,0.10);
}
.fp-btn {
  height: 26px;
  min-width: 26px;
  padding: 0 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--line);
  border-radius: 5px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  cursor: pointer;
  transition: all 0.12s;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}
.fp-btn:hover  { color: var(--text); background: rgba(255,255,255,0.10); border-color: var(--line-strong); }
.fp-btn:active { transform: translateY(1px); }
.fp-btn.icon { padding: 0; width: 26px; }
.fp-btn.icon svg { width: 10px; height: 10px; fill: currentColor; }
.fp-btn.pri { color: var(--text); background: rgba(245,197,66,0.14); border-color: rgba(245,197,66,0.30); }
.fp-btn.pri:hover { background: rgba(245,197,66,0.22); }
.fp-spacer { flex: 1; }

/* ---------- timeline strip ---------- */
.fp-strip-wrap {
  position: relative;
  padding: 12px 0 10px;
  user-select: none;
}
.fp-strip {
  position: relative;
  height: 22px;
  border-radius: 3px;
  background: #0b0b10;
  border: 1px solid var(--line);
  overflow: visible;
  cursor: pointer;
}
.fp-strip.no-media {
  background: #0b0b10;
  cursor: not-allowed;
}
/* selection band between in/out */
.fp-band {
  position: absolute;
  top: 0; bottom: 0;
  background: rgba(245,197,66,0.20);
  border-left: 1px solid var(--accent);
  border-right: 1px solid var(--accent);
  pointer-events: none;
}
/* playhead */
.fp-play {
  position: absolute;
  top: -4px; bottom: -4px;
  width: 2px;
  background: #fff;
  transform: translateX(-1px);
  pointer-events: none;
}
.fp-play::before, .fp-play::after { display: none; }

/* handles: visible pill + generous invisible hit-area for easy dragging */
.fp-h {
  position: absolute;
  top: -5px; bottom: -5px;
  width: 8px;
  background: var(--accent);
  border-radius: 2px;
  cursor: ew-resize;
  transform: translateX(-4px);
  z-index: 3;
}
.fp-h::before {
  content: "";
  position: absolute;
  top: -12px; bottom: -12px; left: -14px; right: -14px;
}
.fp-h::after {
  content: "";
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 1px; height: 14px;
  background: rgba(20,20,26,0.7);
}
.fp-h:hover, .fp-h.dragging { background: #ffd966; }

/* playhead: also draggable — bigger cursor and hit area */
.fp-play {
  cursor: ew-resize;
}
.fp-play::before, .fp-play::after {
  /* keep the wedges as pure visual */
}
/* invisible playhead hit-area */
.fp-play-hit {
  position: absolute;
  top: -12px; bottom: -12px;
  width: 24px;
  transform: translateX(-12px);
  cursor: ew-resize;
  z-index: 2;
}

/* ---------- readout ---------- */
.fp-readout {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  padding: 4px 0 12px;
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.10em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  white-space: nowrap;
}
.fp-readout > * { display: inline-flex; align-items: center; gap: 6px; }
.fp-readout .col-in  { justify-content: flex-start; }
.fp-readout .col-mid { justify-content: center; }
.fp-readout .col-out { justify-content: flex-end; }
.fp-readout b { color: var(--text); font-weight: 600; letter-spacing: 0.04em; font-size: 11px; }
.fp-readout .fp-frame {
  color: var(--accent);
  font-weight: 700;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  padding: 1px 4px;
  border-radius: 3px;
  cursor: text;
  outline: none;
  transition: background 0.12s;
}
.fp-readout .fp-frame:hover { background: rgba(255,255,255,0.04); }
.fp-readout .fp-frame:focus { background: rgba(245,197,66,0.14); color: var(--text); }

/* single-frame mode: hide range chrome via visibility so layout doesn't shift */
.fp-card.single-mode .fp-h,
.fp-card.single-mode .fp-band,
.fp-card.single-mode .fp-readout .col-in,
.fp-card.single-mode .fp-readout .col-out { visibility: hidden; }

/* single-frame mode: playhead becomes a yellow pill (matches the range handles) */
.fp-card.single-mode .fp-play {
  width: 8px;
  transform: translateX(-4px);
  background: var(--accent);
  border-radius: 2px;
  top: -5px; bottom: -5px;
  pointer-events: auto;
  cursor: ew-resize;
}
/* generous hit area for easy grabbing */
.fp-card.single-mode .fp-play::before {
  content: "";
  display: block;
  position: absolute;
  top: -12px; bottom: -12px; left: -10px; right: -10px;
}
.fp-card.single-mode .fp-play:hover,
.fp-card.single-mode .fp-play.dragging { background: #ffd966; }
`;

function injectStyles() {
  if (document.getElementById("frame-picker-styles")) return;
  const s = document.createElement("style");
  s.id = "frame-picker-styles";
  s.textContent = CSS;
  document.head.appendChild(s);
}

function findWidget(node, name) {
  return node.widgets?.find(w => w.name === name);
}
function widgetValue(node, name, fb) {
  const w = findWidget(node, name);
  return w ? w.value : fb;
}
function setWidget(node, name, value) {
  const w = findWidget(node, name);
  if (!w) return;
  w.value = value;
  try { w.callback?.(value); } catch {}
}

app.registerExtension({
  name: "spiritform.FFRAMES",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== "FFRAMES") return;

    const orig = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      orig?.apply(this, arguments);
      injectStyles();
      const node = this;

      // hide the raw widgets — the picker owns them via UI
      for (const wname of ["frame_start", "frame_end", "range_mode"]) {
        const w = findWidget(node, wname);
        if (!w) continue;
        w.type = "hidden";
        w.computeSize = () => [0, -4];
        w.draw = () => {};
        if (w.element) w.element.style.display = "none";
      }

      const root = document.createElement("div");
      root.className = "fp-card";
      root.tabIndex = 0; // enable keyboard
      // block pointerdown from reaching the graph canvas (otherwise clicks
      // start a node-drag). Do NOT stop pointermove/up — those are needed
      // by window-attached drag listeners for the strip handles/playhead.
      root.addEventListener("pointerdown", e => e.stopPropagation());
      root.addEventListener("wheel",       e => e.stopPropagation());
      root.innerHTML = `
        <div class="fp-preview empty" title="Double-click to load"><button type="button" class="fp-clear" title="Clear video">&times;</button><div class="fp-media-frame"></div></div>
        <div class="fp-head">
          <span class="fp-meta"></span>
        </div>
        <div class="fp-transport">
          <button class="fp-btn fp-mode-btn" data-act="mode" title="Toggle single frame / range">RANGE</button>
          <button class="fp-btn icon" data-act="p1" title="Prev frame (← / Shift+← = -10)">
            <svg viewBox="0 0 10 10"><path d="M7 1 L2 5 L7 9 Z"/></svg>
          </button>
          <button class="fp-btn icon fp-play-btn" data-act="play" title="Play / Pause (space)">
            <svg class="fp-icon-play" viewBox="0 0 10 10"><path d="M2 1 L9 5 L2 9 Z"/></svg>
            <svg class="fp-icon-pause" viewBox="0 0 10 10" style="display:none"><path d="M2 2 L8 2 L8 8 L2 8 Z"/></svg>
          </button>
          <button class="fp-btn icon" data-act="n1" title="Next frame (→ / Shift+→ = +10)">
            <svg viewBox="0 0 10 10"><path d="M3 1 L8 5 L3 9 Z"/></svg>
          </button>
          <button class="fp-btn icon" data-act="export" title="Export current frame as PNG">
            <svg viewBox="0 0 12 12"><path d="M6 1 L6 8 M3 5 L6 8 L9 5 M2 10 L10 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
        <div class="fp-strip-wrap">
          <div class="fp-strip no-media"></div>
        </div>
        <div class="fp-readout">
          <span class="col-in">IN <b class="fp-in">0</b></span>
          <span class="col-mid">FRAME <b class="fp-frame" contenteditable="true" spellcheck="false">0</b></span>
          <span class="col-out">OUT <b class="fp-out">0</b></span>
        </div>
      `;

      const $preview   = root.querySelector(".fp-preview");
      const $head      = root.querySelector(".fp-head");
      const $transport = root.querySelector(".fp-transport");
      const $stripWrap = root.querySelector(".fp-strip-wrap");
      const $readout   = root.querySelector(".fp-readout");
      const $frame     = root.querySelector(".fp-frame");
      const $meta      = root.querySelector(".fp-meta");
      const $strip     = root.querySelector(".fp-strip");
      const $inR       = root.querySelector(".fp-in");
      const $outR      = root.querySelector(".fp-out");

      // preview media element (video or img) — swapped on load
      let $media = null;

      const $band = document.createElement("div"); $band.className = "fp-band";
      const $play = document.createElement("div"); $play.className = "fp-play";
      const $hIn  = document.createElement("div"); $hIn.className  = "fp-h";
      const $hOut = document.createElement("div"); $hOut.className = "fp-h";
      $strip.append($band, $play, $hIn, $hOut);

      const state = { total: 0, fps: 0, w: 0, h: 0, playhead: 0 };

      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const frameToPct = f => state.total <= 1 ? 0 : (f / (state.total - 1)) * 100;
      const pctToFrame = p => state.total <= 1 ? 0 : Math.round((p / 100) * (state.total - 1));

      function repaint() {
        const inF  = widgetValue(node, "frame_start", 0) | 0;
        const outF = widgetValue(node, "frame_end", 0) | 0;
        const inPct  = frameToPct(inF);
        const outPct = frameToPct(outF);

        $hIn.style.left  = inPct + "%";
        $hOut.style.left = outPct + "%";
        $band.style.left  = inPct + "%";
        $band.style.width = Math.max(0, outPct - inPct) + "%";
        $play.style.left  = frameToPct(state.playhead) + "%";

        // display frames as 1-based so IN/OUT/FRAME line up with the total
        // count ("241 F") — internal widget values stay 0-based
        $inR.textContent  = inF + 1;
        $outR.textContent = outF + 1;

        if (document.activeElement !== $frame) {
          $frame.textContent = (state.playhead | 0) + 1;
        }

        const metaBits = [];
        if (state.w && state.h) metaBits.push(`<b>${state.w}×${state.h}</b>`);
        if (state.fps)          metaBits.push(`<b>${state.fps.toFixed(2)}</b> FPS`);
        if (state.total)        metaBits.push(`<b>${state.total}</b> F`);
        $meta.innerHTML = metaBits.join("  ·  ");

        // tick width for the strip: aim for ~40-100 visible ticks
        if (state.total > 1) {
          const targetTicks = clamp(state.total, 8, 100);
          const tickW = 100 / targetTicks;
          $strip.style.setProperty("--tick-w", tickW + "%");
          $strip.classList.remove("no-media");
        } else {
          $strip.classList.add("no-media");
        }
      }

      function setPlayhead(f) {
        state.playhead = clamp(f | 0, 0, Math.max(0, state.total - 1));
        // in single mode, the playhead IS the selection — keep start/end synced
        if (!isRange()) {
          setWidget(node, "frame_start", state.playhead);
          setWidget(node, "frame_end",   state.playhead);
        }
        updateMediaFrame();
        repaint();
      }

      function updateMediaFrame() {
        if (!$media) return;
        if ($media.tagName === "VIDEO" && state.fps > 0) {
          try { $media.currentTime = state.playhead / state.fps; } catch {}
        }
      }

      function setPreviewAspect() {
        // set the CSS var on the preview itself — the preview element is the
        // aspect-locked box now; media frame just fills it edge-to-edge.
        if (state.w > 0 && state.h > 0) {
          $preview.style.setProperty("--fp-aspect", `${state.w} / ${state.h}`);
        } else {
          $preview.style.removeProperty("--fp-aspect");
        }
        // aspect drives node height — snap node to fit
        node._fpRefit?.();
      }

      function swapPreviewMedia(name) {
        const $mediaFrame = $preview.querySelector(".fp-media-frame");
        if ($media) { try { $media.pause?.(); } catch {} $media.remove(); $media = null; }

        if (!name) {
          $preview.classList.add("empty");
          setPreviewAspect();
          return;
        }
        $preview.classList.remove("empty");

        const url = api.apiURL(`/view?filename=${encodeURIComponent(name)}&type=input&subfolder=&t=${Date.now()}`);
        const v = document.createElement("video");
        v.src = url;
        v.preload = "auto";
        v.muted = true;
        v.playsInline = true;
        v.disablePictureInPicture = true;
        v.controls = false;
        v.addEventListener("loadedmetadata", () => {
          if (v.videoWidth && v.videoHeight) {
            state.w = v.videoWidth; state.h = v.videoHeight;
          }
          if ((!state.total || state.total <= 1) && v.duration && state.fps > 0) {
            state.total = Math.round(v.duration * state.fps);
            const outF = Math.max(0, state.total - 1);
            if ((widgetValue(node, "frame_end", 0) | 0) === 0) {
              setWidget(node, "frame_end", outF);
            }
          }
          setPreviewAspect();
          repaint();
          updateMediaFrame();
          // one-shot: resize node so preview matches media aspect exactly (no bars)
          requestAnimationFrame(() => requestAnimationFrame(fitNodeToMedia));
        });
        $mediaFrame.appendChild(v);
        $media = v;
        setPreviewAspect();
      }

      // ---- probe (metadata only) + swap preview ----
      async function loadMedia(name) {
        swapPreviewMedia(name);
        if (!name) {
          state.total = 0; state.fps = 0; state.w = 0; state.h = 0;
          setPlayhead(0);
          repaint();
          return;
        }
        try {
          const res = await api.fetchApi(`/frame_picker/probe?file=${encodeURIComponent(name)}`);
          if (!res.ok) throw new Error(await res.text());
          const info = await res.json();
          state.total = info.frames | 0;
          state.fps   = info.fps || 0;
          state.w     = info.width  | 0;
          state.h     = info.height | 0;

          const total = Math.max(1, state.total);
          let curIn  = clamp(widgetValue(node, "frame_start", 0) | 0, 0, total - 1);
          let curOut = widgetValue(node, "frame_end", 0) | 0;
          if (!curOut) curOut = total - 1;
          curOut = clamp(Math.max(curOut, curIn), curIn, total - 1);
          setWidget(node, "frame_start", curIn);
          setWidget(node, "frame_end",   curOut);
          setPlayhead(curIn);
          repaint();
        } catch (err) {
          console.warn("[FramePicker] probe failed:", err);
          state.total = 0;
          setPlayhead(0);
          repaint();
        }
      }

      // ---- upload ----
      async function uploadFile(file) {
        if (!file) return;
        const fd = new FormData();
        fd.append("image", file, file.name);
        fd.append("overwrite", "true");
        try {
          const res = await api.fetchApi("/upload/image", { method: "POST", body: fd });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          const name = data.name || file.name;
          // ensure the combo has this entry so serialization works
          const mw = findWidget(node, "media");
          if (mw && Array.isArray(mw.options?.values) && !mw.options.values.includes(name)) {
            mw.options.values.push(name);
            mw.options.values.sort();
          }
          setWidget(node, "media", name);
          loadMedia(name);
        } catch (err) {
          console.warn("[FramePicker] upload failed:", err);
        }
      }

      function pickFile() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "video/*";
        input.addEventListener("change", () => {
          const f = input.files?.[0];
          if (f) uploadFile(f);
        });
        input.click();
      }

      // double-click preview to load
      $preview.addEventListener("dblclick", e => { e.stopPropagation(); pickFile(); });

      // × clear button — resets media widget and empties preview
      const $clearBtn = root.querySelector(".fp-clear");
      $clearBtn?.addEventListener("click", e => {
        e.stopPropagation();
        setWidget(node, "media", "");
        loadMedia("");
      });
      $clearBtn?.addEventListener("dblclick", e => e.stopPropagation());

      // ---- drag-out: drag preview to canvas → spawn LoadImage node ----
      function captureFrameBlob() {
        return new Promise((resolve) => {
          if (!$media || $media.tagName !== "VIDEO") return resolve(null);
          if (!$media.videoWidth || !$media.videoHeight) return resolve(null);
          const c = document.createElement("canvas");
          c.width = $media.videoWidth;
          c.height = $media.videoHeight;
          c.getContext("2d").drawImage($media, 0, 0);
          c.toBlob(resolve, "image/png");
        });
      }

      $preview.addEventListener("pointerdown", (e) => {
        if ($preview.classList.contains("empty")) return;
        if (e.target === $clearBtn || $clearBtn?.contains(e.target)) return;
        if (e.button !== 0) return;
        const startX = e.clientX, startY = e.clientY;
        let ghost = null, active = false;

        const buildGhost = () => {
          if (!$media?.videoWidth) return;
          const c = document.createElement("canvas");
          c.width = $media.videoWidth;
          c.height = $media.videoHeight;
          c.getContext("2d").drawImage($media, 0, 0);
          ghost = document.createElement("img");
          ghost.src = c.toDataURL("image/png");
          Object.assign(ghost.style, {
            position: "fixed",
            width: "160px",
            height: "auto",
            pointerEvents: "none",
            opacity: "0.75",
            border: "1px solid var(--accent, #f5c542)",
            borderRadius: "4px",
            boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
            zIndex: "100000",
            transform: "translate(-50%, -50%)",
          });
          document.body.appendChild(ghost);
        };
        const moveGhost = (ev) => {
          if (!ghost) return;
          ghost.style.left = ev.clientX + "px";
          ghost.style.top  = ev.clientY + "px";
        };

        const onMove = (ev) => {
          if (!active && (Math.abs(ev.clientX - startX) > 5 || Math.abs(ev.clientY - startY) > 5)) {
            active = true;
            buildGhost();
          }
          if (active) moveGhost(ev);
        };
        const onUp = async (ev) => {
          window.removeEventListener("pointermove", onMove, true);
          window.removeEventListener("pointerup", onUp, true);
          if (!active) return;
          ghost?.remove();

          // don't spawn if released back over ourselves
          const overSelf = ev.target && (root.contains(ev.target));
          if (overSelf) return;

          const blob = await captureFrameBlob();
          if (!blob) return;

          const srcName = (findWidget(node, "media")?.value || "frame").replace(/\.[^.]+$/, "");
          const filename = `${srcName}_f${(state.playhead | 0) + 1}_${Date.now()}.png`;
          const fd = new FormData();
          fd.append("image", blob, filename);
          fd.append("overwrite", "true");
          try {
            const res = await api.fetchApi("/upload/image", { method: "POST", body: fd });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            const name = data.name || filename;

            // convert screen coords → graph coords, then spawn LoadImage
            let gx = ev.clientX, gy = ev.clientY;
            if (typeof app.clientPosToCanvasPos === "function") {
              [gx, gy] = app.clientPosToCanvasPos([ev.clientX, ev.clientY]);
            } else if (app.canvas?.ds) {
              const r = app.canvas.canvas.getBoundingClientRect();
              const s = app.canvas.ds.scale || 1;
              const o = app.canvas.ds.offset || [0, 0];
              gx = (ev.clientX - r.left) / s - o[0];
              gy = (ev.clientY - r.top)  / s - o[1];
            }
            const newNode = LiteGraph.createNode("LoadImage");
            if (!newNode) return;
            newNode.pos = [gx - 100, gy - 20];
            app.graph.add(newNode);
            const imgW = newNode.widgets?.find(w => w.name === "image");
            if (imgW) {
              if (Array.isArray(imgW.options?.values) && !imgW.options.values.includes(name)) {
                imgW.options.values.push(name);
                imgW.options.values.sort();
              }
              imgW.value = name;
              try { imgW.callback?.(name); } catch {}
            }
            app.canvas?.setDirty?.(true, true);
          } catch (err) {
            console.warn("[FramePicker] drag-out spawn failed:", err);
          }
        };
        window.addEventListener("pointermove", onMove, true);
        window.addEventListener("pointerup", onUp, true);
      });

      // drag & drop
      ["dragenter", "dragover"].forEach(ev => {
        $preview.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); $preview.classList.add("drop-hover"); });
      });
      ["dragleave", "drop"].forEach(ev => {
        $preview.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); $preview.classList.remove("drop-hover"); });
      });
      $preview.addEventListener("drop", e => {
        const f = e.dataTransfer?.files?.[0];
        if (f) uploadFile(f);
      });

      // ---- mode: range vs single ----
      const $modeBtn = root.querySelector(".fp-mode-btn");
      function isRange() { return !!widgetValue(node, "range_mode", false); }
      function applyMode() {
        const r = isRange();
        root.classList.toggle("single-mode", !r);
        if ($modeBtn) $modeBtn.textContent = r ? "RANGE" : "SINGLE";
      }
      function toggleMode() {
        const nextRange = !isRange();
        setWidget(node, "range_mode", nextRange);
        if (nextRange) {
          // switching to RANGE: reset selection to full clip
          const last = Math.max(0, (state.total | 0) - 1);
          setWidget(node, "frame_start", 0);
          setWidget(node, "frame_end",   last);
        } else {
          // switching to SINGLE: collapse to current playhead
          setWidget(node, "frame_start", state.playhead);
          setWidget(node, "frame_end",   state.playhead);
        }
        applyMode();
        repaint();
      }
      applyMode(); // reflect initial widget state

      // ---- export current frame as PNG ----
      function exportFrame() {
        if (!$media || $media.tagName !== "VIDEO") return;
        if (!$media.videoWidth || !$media.videoHeight) return;
        const c = document.createElement("canvas");
        c.width = $media.videoWidth;
        c.height = $media.videoHeight;
        c.getContext("2d").drawImage($media, 0, 0);
        c.toBlob(blob => {
          if (!blob) return;
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          const src = (findWidget(node, "media")?.value || "frame").replace(/\.[^.]+$/, "");
          a.download = `${src}_f${(state.playhead | 0) + 1}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(a.href), 0);
        }, "image/png");
      }

      // ---- transport ----
      const step = (delta) => setPlayhead(state.playhead + delta);

      let _playing = false, _playTimer = null;
      const $playBtn   = root.querySelector(".fp-play-btn");
      const $iconPlay  = $playBtn?.querySelector(".fp-icon-play");
      const $iconPause = $playBtn?.querySelector(".fp-icon-pause");
      function setPlaying(on) {
        _playing = !!on;
        if ($iconPlay)  $iconPlay.style.display  = _playing ? "none" : "";
        if ($iconPause) $iconPause.style.display = _playing ? "" : "none";
        if (_playTimer) { clearInterval(_playTimer); _playTimer = null; }
        if (_playing) {
          const period = state.fps > 0 ? 1000 / state.fps : 33;
          _playTimer = setInterval(() => {
            if (!state.total) { setPlaying(false); return; }
            const next = state.playhead + 1;
            if (next >= state.total) { setPlaying(false); return; }
            setPlayhead(next);
          }, period);
        }
      }
      const togglePlay = () => setPlaying(!_playing);

      root.querySelectorAll(".fp-btn").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          const act = btn.dataset.act;
          if (act === "p1")     step(-1);
          if (act === "n1")     step(+1);
          if (act === "play")   togglePlay();
          if (act === "mode")   toggleMode();
          if (act === "export") exportFrame();
        });
      });

      // ---- editable frame counter ----
      $frame.addEventListener("keydown", e => {
        e.stopPropagation();
        if (e.key === "Enter") { e.preventDefault(); $frame.blur(); }
      });
      $frame.addEventListener("blur", () => {
        const v = parseInt($frame.textContent.replace(/\D/g, ""), 10);
        if (!isNaN(v)) setPlayhead(v - 1); // user types 1-based
        else $frame.textContent = (state.playhead | 0) + 1;
      });

      // ---- keyboard shortcuts (only when card focused) ----
      root.addEventListener("keydown", e => {
        if (e.target === $frame) return;
        const mult = e.shiftKey ? 10 : 1;
        if (e.key === "ArrowLeft")  { e.preventDefault(); step(-mult); }
        if (e.key === "ArrowRight") { e.preventDefault(); step(+mult); }
        if (e.key === " ")          { e.preventDefault(); togglePlay(); }
      });

      // ---- strip drag: handles + scrub ----
      function pctFromEvent(e) {
        const r = $strip.getBoundingClientRect();
        return clamp(((e.clientX - r.left) / r.width) * 100, 0, 100);
      }
      let dragging = null;
      function onMove(e) {
        if (!dragging) return;
        const f = pctToFrame(pctFromEvent(e));
        if (dragging === "in") {
          const outF = widgetValue(node, "frame_end", 0) | 0;
          const ni = Math.min(f, outF);
          setWidget(node, "frame_start", ni);
          setPlayhead(ni);
        } else if (dragging === "out") {
          const inF = widgetValue(node, "frame_start", 0) | 0;
          const no = Math.max(f, inF);
          setWidget(node, "frame_end", no);
          setPlayhead(no);
        } else {
          setPlayhead(f);
        }
      }
      function onUp() {
        if (dragging === "in")  $hIn.classList.remove("dragging");
        if (dragging === "out") $hOut.classList.remove("dragging");
        $play.classList.remove("dragging");
        dragging = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }
      function beginDrag(kind, e) {
        if (state.total <= 0 && kind === "scrub") return;
        e.stopPropagation();
        e.preventDefault();
        dragging = kind;
        if (kind === "in")  $hIn.classList.add("dragging");
        if (kind === "out") $hOut.classList.add("dragging");
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        onMove(e);
      }
      $hIn.addEventListener("pointerdown",  e => beginDrag("in",  e));
      $hOut.addEventListener("pointerdown", e => beginDrag("out", e));
      // single-mode: playhead pill is directly draggable
      $play.addEventListener("pointerdown", e => {
        if (isRange()) return;
        $play.classList.add("dragging");
        beginDrag("scrub", e);
      });
      // strip click = scrub playhead directly to click position (handles are
      // z-index above, so their pointerdown wins when clicking on the handle)
      $strip.addEventListener("pointerdown", e => {
        if (e.target === $hIn || e.target === $hOut) return;
        // clicking near an existing handle grabs the handle
        const r = $strip.getBoundingClientRect();
        const clickPct = ((e.clientX - r.left) / r.width) * 100;
        const inF  = widgetValue(node, "frame_start", 0) | 0;
        const outF = widgetValue(node, "frame_end", 0) | 0;
        const inPct  = frameToPct(inF);
        const outPct = frameToPct(outF);
        const grabPx = 12;
        const grabPct = (grabPx / r.width) * 100;
        if (Math.abs(clickPct - inPct)  < grabPct) return beginDrag("in",  e);
        if (Math.abs(clickPct - outPct) < grabPct) return beginDrag("out", e);
        beginDrag("scrub", e);
      });

      // ---- media widget hook ----
      // Media widget: wire the callback so future dropdown changes reload the
      // preview. Fresh nodes stay blank until user picks something. For nodes
      // loaded from a saved workflow, onConfigure fires — we reload the video
      // that was picked before so the selection persists across sessions.
      const mediaW = findWidget(node, "media");
      if (mediaW) {
        const orig = mediaW.callback;
        mediaW.callback = (v) => { try { orig?.(v); } catch {}; loadMedia(v); };
      }
      // start empty; onConfigure below re-populates from serialized state
      $preview.classList.add("empty");

      const origCfgMedia = node.onConfigure;
      node.onConfigure = function () {
        origCfgMedia?.apply(this, arguments);
        // Copy-paste + workflow-load path: Comfy just restored node.size from
        // serialization, but that height was computed for the source node's
        // state (mode / width / aspect). Force a refit so height matches THIS
        // node's actual UI. Load media after — its aspect change refits again.
        requestAnimationFrame(() => {
          node._fpRefit?.();
          const mw = findWidget(node, "media");
          if (mw && mw.value) loadMedia(mw.value);
        });
      };

      // ---- Simple sizing: node is a container, UI scales inside it. ----
      // Never override widget computedHeight. Just give Comfy a min-height
      // floor, then let CSS flex + aspect-ratio scale content within.
      // On media load, ONE-SHOT resize node so preview matches media aspect
      // exactly (no side/top bars).
      const MIN_W      = 320;
      const CARD_MIN_H = 260;

      // Synchronous, width-driven sizing via getHeight. Newer Comfy ignores
      // widget.computeSize overrides — only the getHeight option is honored.
      // Preview height = current node width / aspect; fixed rows measured
      // once and cached. getHeight returns their sum every time Comfy asks.
      const FIXED_ROWS_FALLBACK = 160;
      let _fixedRowsH = FIXED_ROWS_FALLBACK;
      const getAspect = () =>
        state.w > 0 && state.h > 0 ? state.w / state.h : 16 / 9;
      // preview width < node width by (comfy widget margin + 2× card padding).
      // Prefer a live measurement; fall back to a fixed offset for the very
      // first call before the card has laid out.
      const PREVIEW_WIDTH_OFFSET = 44;
      const rowEls = [$head, $transport, $stripWrap, $readout];
      const remeasureFixedRows = () => {
        const total = rowEls.reduce((s, el) => s + el.offsetHeight, 0);
        if (total > 0) _fixedRowsH = Math.ceil(total);
      };
      const getWidgetHeight = () => {
        // if the card is already in the DOM, its scrollHeight is the true
        // content size — matches exactly what CSS layout produces.
        if (root.isConnected && root.scrollHeight > 100) {
          return root.scrollHeight;
        }
        // fallback formula for the very first call (element not yet mounted)
        let previewW = $preview?.offsetWidth || 0;
        if (previewW < 50) {
          const w = Math.max(node.size?.[0] || 380, MIN_W);
          previewW = w - PREVIEW_WIDTH_OFFSET;
        }
        return Math.ceil(previewW / getAspect() + _fixedRowsH);
      };

      node.addDOMWidget("frame_picker_ui", "custom", root, {
        serialize: false,
        hideOnZoom: false,
        getHeight: getWidgetHeight,
        getMinHeight: getWidgetHeight,
      });

      let _lastRefitH = 0;
      const refit = () => {
        remeasureFixedRows();
        const w = Math.max(node.size?.[0] || 380, MIN_W);
        const total = node.computeSize()[1];
        if (Math.abs(total - _lastRefitH) < 2) return; // loop guard
        _lastRefitH = total;
        node.setSize([w, total]);
        node.setDirtyCanvas?.(true, true);
      };

      requestAnimationFrame(() => {
        remeasureFixedRows();
        refit();
        // keep it live: any row or preview resize triggers a refit so we
        // never under-estimate (font load, aspect change, node width drag).
        if (typeof ResizeObserver === "undefined") return;
        const ro = new ResizeObserver(() => refit());
        [...rowEls, $preview, root].forEach(el => ro.observe(el));
      });

      // expose refit so setPreviewAspect can re-run it after media loads
      node._fpRefit = refit;

      const origResize = node.onResize;
      node.onResize = function (size) {
        origResize?.apply(this, arguments);
        if (size[0] < MIN_W) size[0] = MIN_W;
        // height always tracks width × aspect + fixed rows; the user can't
        // pull the node taller than the UI needs.
        size[1] = node.computeSize()[1];
        node.setDirtyCanvas?.(true, true);
      };

      // no-op stub for legacy callers
      function fitNodeToMedia() {}

      // don't touch node.size — let Comfy's computeSize sum widgets to
      // find the correct total (title + pins + media + DOM height)
      requestAnimationFrame(() => {
        const w = Math.max(node.size?.[0] || 380, MIN_W);
        const total = node.computeSize()[1];
        node.setSize([w, total]);
        node.setDirtyCanvas?.(true, true);
      });
      repaint();
    };
  },
});
