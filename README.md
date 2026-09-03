# comfy-frame-picker

Hybrid frame extractor + trimmer for ComfyUI. One node that:

- accepts an **IMAGE batch** (e.g. from `VHS_LoadVideo`) or a **video/image file** you upload;
- shows a scrubbable **filmstrip preview** with **in / out handles**;
- outputs the selected frame range as an `IMAGE` batch (single frame if in == out).

## Install

Clone into your `ComfyUI/custom_nodes/`:

```
cd ComfyUI/custom_nodes
git clone https://github.com/spiritform/comfy-frame-picker
```

Requires `opencv-python`, `pillow`, `numpy` (already present in most Comfy installs).

## Use

Add **Frame Picker** (category `image/animation`). Either:

- upload a video / image via the `media` widget, then drag the in/out handles, **or**
- connect a batch of images to `images` — the picker will slice by `frame_start` / `frame_end`.

Outputs:

- `images` — the selected slice as an `IMAGE` batch
- `count` — number of frames in the slice
