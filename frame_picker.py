"""
Frame Picker — hybrid frame extractor + trimmer with scrubbable preview.

Accepts either an upstream IMAGE batch (e.g. VHS_LoadVideo) or a video file
uploaded via the widget. Outputs the [start..end] slice as an IMAGE batch.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import numpy as np
import torch

import folder_paths
from server import PromptServer
from aiohttp import web

try:
    import cv2
    _HAS_CV2 = True
except Exception:
    _HAS_CV2 = False


VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"}

_THUMB_CACHE_DIR = Path(folder_paths.get_temp_directory()) / "frame_picker"
_THUMB_CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _resolve_input_path(name: str) -> Path | None:
    """Resolve a file dropped/uploaded via /upload/image (lives in input/)."""
    if not name:
        return None
    p = Path(folder_paths.get_annotated_filepath(name))
    return p if p.exists() else None


def _probe_video(path: Path) -> tuple[int, float]:
    if not _HAS_CV2:
        raise RuntimeError("opencv-python is required for video decode")
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise RuntimeError(f"could not open video: {path}")
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    cap.release()
    return n, fps


def _decode_video_range(path: Path, start: int, end: int) -> tuple[torch.Tensor, float]:
    """Return (frames_tensor, fps). Pre-allocates one float32 buffer to avoid
    the np.stack + astype chain that would triple peak memory."""
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise RuntimeError(f"could not open video: {path}")
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    fps   = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    w     = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)  or 0)
    h     = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    if total <= 0 or w <= 0 or h <= 0:
        cap.release()
        raise RuntimeError(f"could not read video metadata: {path}")

    start = max(0, min(start, total - 1))
    end   = max(start, min(end, total - 1))
    n     = end - start + 1

    # sanity check — 4 bytes per float32 channel
    est_gb = (n * h * w * 3 * 4) / (1024 ** 3)
    try:
        arr = np.empty((n, h, w, 3), dtype=np.float32)
    except MemoryError:
        cap.release()
        raise RuntimeError(
            f"frame_picker: not enough memory for {n} frames at {w}x{h} "
            f"(~{est_gb:.1f} GB). Narrow the IN/OUT range or use SINGLE mode."
        )

    cap.set(cv2.CAP_PROP_POS_FRAMES, float(start))
    read = 0
    for i in range(n):
        ok, frame = cap.read()
        if not ok:
            break
        # BGR uint8 → RGB float32 [0,1], written directly into the slot
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        np.divide(frame, 255.0, out=arr[i], casting="unsafe")
        read += 1
    cap.release()

    if read == 0:
        raise RuntimeError("no frames decoded")
    if read < n:
        arr = arr[:read]
    return torch.from_numpy(arr), fps


def _hash_file(path: Path) -> str:
    h = hashlib.md5()
    st = path.stat()
    h.update(str(path).encode())
    h.update(str(st.st_size).encode())
    h.update(str(int(st.st_mtime)).encode())
    return h.hexdigest()[:16]


def _probe(path: Path) -> dict:
    """Return {frames, fps, width, height} — cached on disk."""
    key = _hash_file(path)
    cache = _THUMB_CACHE_DIR / f"{key}.json"
    if cache.exists():
        try:
            return json.loads(cache.read_text())
        except Exception:
            pass

    if not _HAS_CV2:
        raise RuntimeError("opencv-python is required for video probe")

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise RuntimeError(f"could not open: {path}")
    fps    = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

    # opencv's FRAME_COUNT is unreliable for some codecs — walk the stream
    # from the last-known position to count precisely if needed.
    if frames <= 1 and fps > 0:
        # try milliseconds-based estimate first (fast, sometimes right)
        cap.set(cv2.CAP_PROP_POS_AVI_RATIO, 1.0)
        dur_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
        cap.set(cv2.CAP_PROP_POS_MSEC, 0)
        if dur_ms and dur_ms > 0:
            frames = max(frames, int(round(dur_ms / 1000.0 * fps)))

    cap.release()

    out = {"frames": frames, "fps": fps, "width": width, "height": height}
    cache.write_text(json.dumps(out))
    return out


# ------------- HTTP: thumbnail-strip endpoint -------------

@PromptServer.instance.routes.get("/frame_picker/probe")
async def _probe_route(request: web.Request):
    name = request.query.get("file", "")
    p = _resolve_input_path(name)
    if not p:
        return web.json_response({"error": "not found"}, status=404)
    try:
        info = _probe(p)
        return web.json_response(info)
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


# ------------- Node -------------

class FFRAMES:
    @classmethod
    def INPUT_TYPES(cls):
        input_dir = folder_paths.get_input_directory()
        files = [f for f in os.listdir(input_dir)
                 if os.path.isfile(os.path.join(input_dir, f))
                 and Path(f).suffix.lower() in VIDEO_EXTS]
        files = sorted(files)
        return {
            "required": {
                "frame_start": ("INT", {"default": 0, "min": 0, "max": 999999, "step": 1}),
                "frame_end":   ("INT", {"default": 0, "min": 0, "max": 999999, "step": 1}),
                "range_mode":  ("BOOLEAN", {"default": True, "label_on": "range", "label_off": "single"}),
            },
            "optional": {
                "images": ("IMAGE",),
                "media":  (sorted(files) or [""], {"video_upload": True}),
            },
        }

    RETURN_TYPES = ("IMAGE", "INT", "FLOAT", "FLOAT")
    RETURN_NAMES = ("images", "frame_count", "fps", "duration")
    FUNCTION = "pick"
    CATEGORY = "image/animation"

    def pick(self, frame_start: int, frame_end: int, range_mode: bool = True,
             images: torch.Tensor | None = None,
             media: str = ""):
        # single-frame mode collapses to just the start frame
        if not range_mode:
            frame_end = frame_start

        # 1. connected batch wins (unknown fps — 0.0)
        if images is not None and images.shape[0] > 0:
            n = images.shape[0]
            s = max(0, min(frame_start, n - 1))
            e = max(s, min(frame_end, n - 1))
            out = images[s:e + 1]
            return (out, int(out.shape[0]), 0.0, 0.0)

        # 2. widget-picked video
        path = _resolve_input_path(media)
        if not path:
            raise RuntimeError("frame_picker: no input (connect IMAGE or pick a video)")
        if path.suffix.lower() not in VIDEO_EXTS:
            raise RuntimeError(f"frame_picker: unsupported extension {path.suffix}")
        out, fps = _decode_video_range(path, frame_start, frame_end)
        count = int(out.shape[0])
        duration = count / fps if fps > 0 else 0.0
        return (out, count, float(fps), float(duration))

    @classmethod
    def IS_CHANGED(cls, frame_start, frame_end, range_mode=True, images=None, media=""):
        p = _resolve_input_path(media)
        if not p:
            return f"{frame_start}:{frame_end}:{range_mode}"
        st = p.stat()
        return f"{p}|{st.st_size}|{int(st.st_mtime)}|{frame_start}:{frame_end}:{range_mode}"


NODE_CLASS_MAPPINGS = {"FFRAMES": FFRAMES}
NODE_DISPLAY_NAME_MAPPINGS = {"FFRAMES": "FFRAMES"}
