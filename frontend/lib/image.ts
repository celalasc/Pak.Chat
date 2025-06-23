export async function createImagePreview(file: File, maxDim = 800): Promise<File | null> {
  if (!file.type.startsWith('image/')) return null;

  // Skip small images to save CPU and bandwidth
  if (file.size <= 500 * 1024) return null; // 500 KB (increased from 200 KB)

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

  // Preserve original format for PNG, use JPEG for others with higher quality
  const isOriginallyPng = file.type === 'image/png';
  const outputFormat = isOriginallyPng ? 'image/png' : 'image/jpeg';
  const quality = isOriginallyPng ? undefined : 0.9; // PNG doesn't use quality, JPEG quality 90%

  // Convert canvas back to Blob
  const blob: Blob | null = await new Promise((resolve) => {
    if (isOriginallyPng) {
      canvas.toBlob((b) => resolve(b), outputFormat);
    } else {
      canvas.toBlob((b) => resolve(b), outputFormat, quality);
    }
  });

  if (!blob) return null;

  // Return as File object with appropriate extension
  const fileExt = isOriginallyPng ? '.png' : '.jpg';
  const previewFileName = file.name.replace(/\.[^/.]+$/, '') + '_preview' + fileExt;
  return new File([blob], previewFileName, { type: outputFormat });
} 