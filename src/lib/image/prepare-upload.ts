import sharp from "sharp";

import type {
  ScreenshotInput,
  ScreenshotMediaType,
} from "@/features/analyze-offer/application/offer-facts-extractor";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_LONG_SIDE = 1_568;
const MAX_INPUT_PIXELS = 40_000_000;

const supportedTypes = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/webp": "webp",
} as const satisfies Record<string, string>;

type UploadFile = {
  readonly size: number;
  readonly type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type PreparedScreenshot = ScreenshotInput & {
  readonly width: number;
  readonly height: number;
  readonly byteLength: number;
};

export type ImagePreparationResult =
  | { readonly ok: true; readonly screenshot: PreparedScreenshot }
  | {
      readonly ok: false;
      readonly error: "invalid_file" | "file_too_large" | "unsupported_image";
    };

export async function prepareScreenshotUpload(
  file: UploadFile,
): Promise<ImagePreparationResult> {
  if (file.size <= 0) return { ok: false, error: "invalid_file" };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "file_too_large" };
  }
  if (!(file.type in supportedTypes)) {
    return { ok: false, error: "unsupported_image" };
  }

  const input = Buffer.from(await file.arrayBuffer());
  try {
    const image = sharp(input, {
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
      animated: false,
    }).rotate();
    const metadata = await image.metadata();
    const expectedFormat =
      supportedTypes[file.type as keyof typeof supportedTypes];
    if (
      metadata.format !== expectedFormat ||
      metadata.width === undefined ||
      metadata.height === undefined ||
      (metadata.pages ?? 1) > 1
    ) {
      return { ok: false, error: "unsupported_image" };
    }

    const resized = image.resize({
      width: MAX_IMAGE_LONG_SIDE,
      height: MAX_IMAGE_LONG_SIDE,
      fit: "inside",
      withoutEnlargement: true,
    });
    let output: Buffer;
    const mediaType = file.type as ScreenshotMediaType;
    if (mediaType === "image/jpeg") {
      output = await resized.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    } else if (mediaType === "image/webp") {
      output = await resized.webp({ quality: 85 }).toBuffer();
    } else {
      output = await resized.png({ compressionLevel: 9 }).toBuffer();
    }
    const outputMetadata = await sharp(output).metadata();
    if (
      outputMetadata.width === undefined ||
      outputMetadata.height === undefined
    ) {
      return { ok: false, error: "unsupported_image" };
    }
    return {
      ok: true,
      screenshot: {
        base64Data: output.toString("base64"),
        mediaType,
        width: outputMetadata.width,
        height: outputMetadata.height,
        byteLength: output.byteLength,
      },
    };
  } catch {
    return { ok: false, error: "unsupported_image" };
  }
}
