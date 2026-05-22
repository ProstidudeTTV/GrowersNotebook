/** Pan/zoom state for square avatar crop (viewport in CSS pixels). */
export type AvatarCropState = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

/** Minimum scale so the image fully covers the square crop viewport. */
export function coverScale(
  imgW: number,
  imgH: number,
  viewport: number,
): number {
  return Math.max(viewport / imgW, viewport / imgH);
}

/**
 * Renders a square JPEG from the visible region inside `viewport`×`viewport` UI.
 * `state.scale` is relative to `coverScale` (1 = just covers, >1 = zoom in).
 */
export async function renderAvatarCropJpeg(
  image: HTMLImageElement,
  viewport: number,
  outputSize: number,
  state: AvatarCropState,
  quality = 0.92,
): Promise<Blob> {
  const base = coverScale(image.naturalWidth, image.naturalHeight, viewport);
  const scale = base * state.scale;
  const drawW = image.naturalWidth * scale;
  const drawH = image.naturalHeight * scale;
  const x = (viewport - drawW) / 2 + state.offsetX;
  const y = (viewport - drawH) / 2 + state.offsetY;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare crop canvas.");

  const ratio = outputSize / viewport;
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, outputSize, outputSize);
  ctx.drawImage(
    image,
    x * ratio,
    y * ratio,
    drawW * ratio,
    drawH * ratio,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
  });
  if (!blob) throw new Error("Could not export cropped image.");
  return blob;
}

/** Clamp pan so the image still covers the crop viewport. */
export function clampAvatarPan(
  imgW: number,
  imgH: number,
  viewport: number,
  state: AvatarCropState,
): AvatarCropState {
  const base = coverScale(imgW, imgH, viewport);
  const scale = base * state.scale;
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const maxX = Math.max(0, (drawW - viewport) / 2);
  const maxY = Math.max(0, (drawH - viewport) / 2);
  return {
    ...state,
    offsetX: Math.min(maxX, Math.max(-maxX, state.offsetX)),
    offsetY: Math.min(maxY, Math.max(-maxY, state.offsetY)),
  };
}
