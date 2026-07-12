import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  MAX_IMAGE_LONG_SIDE,
  MAX_UPLOAD_BYTES,
  prepareScreenshotUpload,
} from "@/lib/image/prepare-upload";

function uploadFile(buffer: Buffer, type: string) {
  return {
    size: buffer.byteLength,
    type,
    async arrayBuffer() {
      return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer;
    },
  };
}

describe("prepareScreenshotUpload", () => {
  it("decodes, strips metadata, and resizes a valid image to 1568px", async () => {
    const source = await sharp({
      create: {
        width: 2_400,
        height: 1_200,
        channels: 3,
        background: "#4e9be8",
      },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    const result = await prepareScreenshotUpload(
      uploadFile(source, "image/jpeg"),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.screenshot.width).toBe(784);
      expect(result.screenshot.height).toBe(MAX_IMAGE_LONG_SIDE);
      expect(result.screenshot.mediaType).toBe("image/jpeg");
      const output = Buffer.from(result.screenshot.base64Data, "base64");
      const metadata = await sharp(output).metadata();
      expect(metadata.orientation).toBeUndefined();
    }
  });

  it("rejects empty and oversized files before decoding", async () => {
    const empty = await prepareScreenshotUpload(
      uploadFile(Buffer.alloc(0), "image/png"),
    );
    expect(empty).toEqual({ ok: false, error: "invalid_file" });

    const oversized = await prepareScreenshotUpload({
      size: MAX_UPLOAD_BYTES + 1,
      type: "image/png",
      async arrayBuffer() {
        throw new Error("must not read oversized content");
      },
    });
    expect(oversized).toEqual({ ok: false, error: "file_too_large" });
  });

  it("rejects unsupported MIME types, corrupt data, and MIME spoofing", async () => {
    const text = Buffer.from("not an image");
    expect(
      await prepareScreenshotUpload(uploadFile(text, "application/pdf")),
    ).toEqual({
      ok: false,
      error: "unsupported_image",
    });
    expect(
      await prepareScreenshotUpload(uploadFile(text, "image/png")),
    ).toEqual({
      ok: false,
      error: "unsupported_image",
    });

    const jpeg = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "white" },
    })
      .jpeg()
      .toBuffer();
    expect(
      await prepareScreenshotUpload(uploadFile(jpeg, "image/png")),
    ).toEqual({
      ok: false,
      error: "unsupported_image",
    });
  });
});
