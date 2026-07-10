"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import styles from "./UploadPhotoModal.module.css";

interface UploadPhotoModalProps {
  /** The raw data-URL of the selected image (from file picker). */
  rawImage: string;
  onCancel: () => void;
  /** Called with the cropped image as a File for multipart/form-data upload. */
  onUpload: (file: File) => Promise<void> | void;
  uploading?: boolean;
}

/**
 * Crop + downscale and return as a JPEG File.
 * Backend expects multipart/form-data with a real image file.
 */
async function getCroppedFile(imageSrc: string, crop: Area): Promise<File> {
  const MAX_SIZE = 800;
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const scale = Math.min(1, MAX_SIZE / Math.max(crop.width, crop.height));
  canvas.width = Math.round(crop.width * scale);
  canvas.height = Math.round(crop.height * scale);

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
  );
  console.log(`[upload] Cropped image: ${Math.round(blob.size / 1024)} KB`);
  return new File([blob], "profile.jpg", { type: "image/jpeg" });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

export default function UploadPhotoModal({
  rawImage,
  onCancel,
  onUpload,
  uploading = false,
}: UploadPhotoModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback(
    (_: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    []
  );

  async function handleUpload() {
    if (!croppedAreaPixels) return;
    const file = await getCroppedFile(rawImage, croppedAreaPixels);
    await onUpload(file);
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.cropContainer}>
          <Cropper
            image={rawImage}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className={styles.zoomSlider}>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className={styles.slider}
          />
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.uploadBtn}
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Crop & Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
