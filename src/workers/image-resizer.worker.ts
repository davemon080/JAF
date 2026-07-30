/* eslint-disable @typescript-eslint/no-explicit-any */

// Dedicated Web Worker for background image resizing
interface ProcessImageMessage {
  id: string;
  file: File | Blob;
  maxDim?: number;
  quality?: number;
  targetMaxBytes?: number;
}

// Convert Blob to Base64 data URL inside worker
async function blobToBase64(blob: Blob): Promise<string> {
  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  // ArrayBuffer fallback
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${blob.type};base64,${btoa(binary)}`;
}

self.onmessage = async (e: MessageEvent<ProcessImageMessage>) => {
  const { id, file, maxDim = 1400, quality = 0.9, targetMaxBytes = 400000 } = e.data;

  try {
    // Check OffscreenCanvas support in worker
    if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") {
      throw new Error("OffscreenCanvas not supported in Web Worker");
    }

    const bitmap = await createImageBitmap(file);
    const origWidth = bitmap.width;
    const origHeight = bitmap.height;

    // Helper to calculate target dimensions maintaining aspect ratio
    const calculateDim = (targetMax: number) => {
      let w = origWidth;
      let h = origHeight;
      if (w > targetMax || h > targetMax) {
        if (w > h) {
          h = Math.round((h * targetMax) / w);
          w = targetMax;
        } else {
          w = Math.round((w * targetMax) / h);
          h = targetMax;
        }
      }
      return { w: Math.max(1, w), h: Math.max(1, h) };
    };

    const processAtDim = async (
      dim: number,
      q: number,
    ): Promise<{ base64: string; blob: Blob; width: number; height: number }> => {
      const { w, h } = calculateDim(dim);

      // Multi-step downscaling for high quality when scaling large images down
      let currentBitmap: ImageBitmap | OffscreenCanvas = bitmap;
      let currW = origWidth;
      let currH = origHeight;

      while (currW / 2 >= w && currH / 2 >= h) {
        currW = Math.floor(currW / 2);
        currH = Math.floor(currH / 2);
        const stepCanvas = new OffscreenCanvas(currW, currH);
        const stepCtx = stepCanvas.getContext("2d");
        if (stepCtx) {
          stepCtx.imageSmoothingEnabled = true;
          stepCtx.imageSmoothingQuality = "high";
          stepCtx.drawImage(currentBitmap, 0, 0, currW, currH);
          currentBitmap = stepCanvas;
        }
      }

      // Final canvas draw
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create 2D context on OffscreenCanvas");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(currentBitmap, 0, 0, w, h);

      const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: q });
      const base64 = await blobToBase64(blob);
      return { base64, blob, width: w, height: h };
    };

    // Attempt 1: Default target size & quality
    let result = await processAtDim(maxDim, quality);

    // Attempt 2 & 3: Ensure base64 payload stays strictly under property limit while preserving quality
    if (result.base64.length > targetMaxBytes) {
      result = await processAtDim(1100, Math.max(0.84, quality - 0.06));
    }
    if (result.base64.length > targetMaxBytes) {
      result = await processAtDim(900, Math.max(0.78, quality - 0.12));
    }

    self.postMessage({
      id,
      success: true,
      base64Url: result.base64,
      originalSize: file.size,
      processedSize: result.blob.size,
      width: result.width,
      height: result.height,
      origWidth,
      origHeight,
      isWorker: true,
    });
  } catch (err: any) {
    self.postMessage({
      id,
      success: false,
      error: err?.message || "Worker processing error",
    });
  }
};
