"use client";

import { useState, useRef, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import Button from "@/app/components/ui/Button/Button";
import styles from "./ProfileImageForm.module.css";

function UploadIcon() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

interface ProfileImageFormProps {
  onNext: () => void;
  onBack: () => void;
  profileImage: File | null;
  onProfileImageChange: (file: File | null) => void;
  submitting?: boolean;
}

/**
 * Creates a cropped File from the source image using canvas.
 */
async function getCroppedFile(
  imageSrc: string,
  crop: Area
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = crop.width;
  canvas.height = crop.height;
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
  );
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

export default function ProfileImageForm({
  onNext,
  onBack,
  profileImage,
  onProfileImageChange,
  submitting = false,
}: ProfileImageFormProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [showCrop, setShowCrop] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // If parent already has an image, show a preview on mount.
  const hasImage = profileImage !== null || preview !== null;

  const onCropComplete = useCallback(
    (_: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    []
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setRawImage(result);
      setShowCrop(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleCropSave() {
    if (!rawImage || !croppedAreaPixels) return;
    const file = await getCroppedFile(rawImage, croppedAreaPixels);
    onProfileImageChange(file);
    // Create preview URL for display.
    setPreview(URL.createObjectURL(file));
    setShowCrop(false);
  }

  function handleCropCancel() {
    setShowCrop(false);
    setRawImage(null);
  }

  function handleChangeImage() {
    fileRef.current?.click();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext();
  }

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <h2 className={styles.title}>Profile Photo</h2>
        <p className={styles.subtitle}>
          Add a profile photo (optional)
        </p>

        {hasImage && preview ? (
          <div className={styles.previewContainer}>
            <img
              src={preview}
              alt="Profile preview"
              className={styles.previewImage}
            />
            <button
              type="button"
              className={styles.changeBtn}
              onClick={handleChangeImage}
            >
              Change Image
            </button>
          </div>
        ) : (
          <div
            className={styles.uploadArea}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                fileRef.current?.click();
            }}
          >
            <span className={styles.uploadIcon}>
              <UploadIcon />
            </span>
            <span className={styles.uploadText}>Upload Image</span>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className={styles.hiddenInput}
        />

        <div className={styles.buttonWrapper}>
          <div className={styles.buttonRow}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={onBack}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Back</span>
            </button>
            <div className={styles.continueBtn}>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Saving..." : "Save & Continue"}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Crop Modal Overlay */}
      {showCrop && rawImage && (
        <div className={styles.cropOverlay}>
          <div className={styles.cropModal}>
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
            <div className={styles.cropActions}>
              <button
                type="button"
                className={styles.cropCancelBtn}
                onClick={handleCropCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.cropSaveBtn}
                onClick={handleCropSave}
              >
                Crop &amp; Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
