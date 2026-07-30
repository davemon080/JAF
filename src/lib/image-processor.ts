export interface ResizeOptions {
  maxDim?: number;
  quality?: number;
  targetMaxBytes?: number;
}

export interface ResizeResult {
  base64Url: string;
  originalSize: number;
  processedSize: number;
  width: number;
  height: number;
  origWidth?: number;
  origHeight?: number;
  isWorker: boolean;
}

// Flag to control Web Worker execution for image resizing
const WORKER_ENABLED = true;

// Singleton Web Worker instance (lazy created)
let imageWorkerInstance: Worker | null = null;
const pendingWorkerTasks: Map<
  string,
  {
    resolve: (res: ResizeResult) => void;
    reject: (err: Error) => void;
  }
> = new Map();

function getImageWorker(): Worker | null {
  if (!WORKER_ENABLED || typeof window === "undefined") return null;
  if (imageWorkerInstance) return imageWorkerInstance;

  try {
    imageWorkerInstance = new Worker(
      new URL("../workers/image-resizer.worker.ts", import.meta.url),
      { type: "module" },
    );

    imageWorkerInstance.onmessage = (e: MessageEvent) => {
      const { id, success, error, ...data } = e.data || {};
      const task = pendingWorkerTasks.get(id);
      if (!task) return;

      pendingWorkerTasks.delete(id);

      if (success) {
        task.resolve(data as ResizeResult);
      } else {
        task.reject(new Error(error || "Worker resizing failed"));
      }
    };

    imageWorkerInstance.onerror = (err) => {
      console.warn("Image Web Worker error, falling back to main thread:", err);
      pendingWorkerTasks.forEach((task) => {
        task.reject(new Error("Worker thread unavailable"));
      });
      pendingWorkerTasks.clear();
      imageWorkerInstance = null;
    };

    return imageWorkerInstance;
  } catch (err) {
    console.warn("Could not instantiate Web Worker, falling back to main thread:", err);
    return null;
  }
}

async function resizeOnMainThread(
  fileOrBlobOrUrl: File | Blob | string,
  options: ResizeOptions = {},
): Promise<ResizeResult> {
  const { maxDim = 1400, quality = 0.9, targetMaxBytes = 400000 } = options;

  return new Promise((resolve, reject) => {
    const processSrc = (src: string, fileSizeBytes: number) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image element"));
      img.onload = () => {
        const origWidth = img.width;
        const origHeight = img.height;

        const attempt = (
          dim: number,
          q: number,
        ): { base64: string; width: number; height: number } => {
          let w = origWidth;
          let h = origHeight;
          if (w > dim || h > dim) {
            if (w > h) {
              h = Math.round((h * dim) / w);
              w = dim;
            } else {
              w = Math.round((w * dim) / h);
              h = dim;
            }
          }
          w = Math.max(1, w);
          h = Math.max(1, h);

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return { base64: src, width: w, height: h };

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, w, h);

          const base64 = canvas.toDataURL("image/jpeg", q);
          return { base64, width: w, height: h };
        };

        let res = attempt(maxDim, quality);
        if (res.base64.length > targetMaxBytes) {
          res = attempt(900, 0.78);
        }
        if (res.base64.length > targetMaxBytes) {
          res = attempt(750, 0.7);
        }

        resolve({
          base64Url: res.base64,
          originalSize: fileSizeBytes,
          processedSize: Math.round((res.base64.length * 3) / 4),
          width: res.width,
          height: res.height,
          origWidth,
          origHeight,
          isWorker: false,
        });
      };
      img.src = src;
    };

    if (typeof fileOrBlobOrUrl === "string") {
      processSrc(fileOrBlobOrUrl, fileOrBlobOrUrl.length);
    } else {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.onload = (evt) => {
        if (evt.target?.result) {
          processSrc(evt.target.result as string, fileOrBlobOrUrl.size);
        } else {
          reject(new Error("Failed to read image file data"));
        }
      };
      reader.readAsDataURL(fileOrBlobOrUrl);
    }
  });
}

/**
 * High-performance product image resizer using Web Worker offloading
 * for fast and efficient canvas image downscaling.
 */
export async function processProductImage(
  fileOrBlobOrUrl: File | Blob | string,
  options: ResizeOptions = {},
): Promise<ResizeResult> {
  // If string URL (not Data URL), process or pass through
  if (typeof fileOrBlobOrUrl === "string" && !fileOrBlobOrUrl.startsWith("data:")) {
    return resizeOnMainThread(fileOrBlobOrUrl, options);
  }

  // Attempt Web Worker processing for File/Blob
  if (typeof fileOrBlobOrUrl !== "string") {
    const worker = getImageWorker();
    if (worker) {
      const taskId = "task_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
      try {
        const result = await new Promise<ResizeResult>((resolve, reject) => {
          pendingWorkerTasks.set(taskId, { resolve, reject });
          worker.postMessage({
            id: taskId,
            file: fileOrBlobOrUrl,
            maxDim: options.maxDim ?? 1400,
            quality: options.quality ?? 0.9,
            targetMaxBytes: options.targetMaxBytes ?? 400000,
          });

          // Timeout safety - fallback if worker takes > 8 seconds
          setTimeout(() => {
            if (pendingWorkerTasks.has(taskId)) {
              pendingWorkerTasks.delete(taskId);
              reject(new Error("Web Worker timeout"));
            }
          }, 8000);
        });
        return result;
      } catch (workerErr) {
        console.warn("Web Worker execution failed, falling back to main thread:", workerErr);
      }
    }
  }

  // Fallback to main thread
  return resizeOnMainThread(fileOrBlobOrUrl, options);
}
