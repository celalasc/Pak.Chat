export async function createImagePreview(file: File, maxDim = 400): Promise<File | null> {
  if (!file.type.startsWith('image/')) return null;

  // Skip very small images to save CPU; preview not necessary
  if (file.size <= 200 * 1024) return null; // 200 KB

  // Read the file into a data URL
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });

  // Create HTMLImageElement to get dimensions
  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (e) => reject(e);
    image.src = dataUrl;
  });

  let { width, height } = img;
  if (width === 0 || height === 0) return null;

  // Calculate new size keeping aspect ratio
  if (width > height) {
    if (width > maxDim) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    }
  } else {
    if (height > maxDim) {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, width, height);

  // Convert canvas back to Blob (JPEG 0.7 quality)
  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.7);
  });

  if (!blob) return null;

  // Return as File object
  const previewFileName = file.name.replace(/\.[^/.]+$/, '') + '_preview.jpg';
  return new File([blob], previewFileName, { type: 'image/jpeg' });
} 