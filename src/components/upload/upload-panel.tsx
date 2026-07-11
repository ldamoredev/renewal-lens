import type { ChangeEvent, DragEvent } from "react";

type UploadPanelProps = {
  fileName: string | null;
  isDragging: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragStateChange: (isDragging: boolean) => void;
  onDrop: (event: DragEvent<HTMLLabelElement>) => void;
};

export function UploadPanel({
  fileName,
  isDragging,
  onFileChange,
  onDragStateChange,
  onDrop,
}: UploadPanelProps) {
  return (
    <div className="upload-panel">
      <div className="panel-label">
        <span>01</span> Add your screenshot
      </div>
      <label
        className={`dropzone${isDragging ? "dropzone--active" : ""}`}
        onDragEnter={() => onDragStateChange(true)}
        onDragLeave={() => onDragStateChange(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <input
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onFileChange}
        />
        <span className="dropzone__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
          </svg>
        </span>
        <span className="dropzone__title">
          {fileName ?? "Drop a pricing screenshot here"}
        </span>
        <span className="dropzone__copy">or choose a PNG, JPG or WebP</span>
        <span className="button button--primary">Choose screenshot</span>
      </label>
      <div className="privacy-note">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M6.5 9V6.5a3.5 3.5 0 1 1 7 0V9m-8 0h9a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z" />
        </svg>
        Screenshots are processed for analysis and are not stored.
      </div>
    </div>
  );
}
