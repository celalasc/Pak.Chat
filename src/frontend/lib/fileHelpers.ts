import heic2any from 'heic2any';

export async function convertToSupportedImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const type = file.type.toLowerCase();
  if (['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(type)) {
    return file;
  }

  if (type === 'image/heic' || type === 'image/heif') {
    try {
      const converted = (await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })) as Blob;
      return new File([converted], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' });
    } catch (err) {
      console.error('HEIC conversion failed:', err);
      return file;
    }
  }

  // Fallback conversion using canvas for other image types (e.g., TIFF)
  try {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(img, 0, 0);

    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9);
    });
    if (blob) {
      return new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' });
    }
  } catch (err) {
    console.error('Image conversion failed:', err);
  }

  return file;
}
