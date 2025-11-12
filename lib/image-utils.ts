export function getDisplayableImageUrl(imagePath?: string, filename?: string): string {
  if (!imagePath) {
    return `https://placehold.co/300x200/cccccc/666666?text=No+Image`;
  }

  if (imagePath.startsWith('/uploads/')) {
    return imagePath;
  }

  if (imagePath.startsWith('gs://')) {
    const displayName = filename || 'Image';
    return `https://placehold.co/300x200/4287f5/ffffff?text=${encodeURIComponent(displayName)}`;
  }

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  return `/uploads/${imagePath}`;
}

export function getLocalPreviewPath(uploadResult: { path?: string; filename?: string }): string {
  if (uploadResult.path && uploadResult.path.startsWith('/uploads/')) {
    return uploadResult.path;
  }

  if (uploadResult.filename) {
    return `/uploads/${uploadResult.filename}`;
  }

  return '';
}

export function getThumbnailUrl(imagePath?: string, filename?: string): string {
  if (!imagePath) {
    return `https://placehold.co/64x64/cccccc/666666?text=Error`;
  }

  if (imagePath.startsWith('/uploads/')) {
    return imagePath;
  }

  if (imagePath.startsWith('gs://')) {
    const displayName = filename?.substring(0, 10) || 'Image';
    return `https://placehold.co/64x64/4287f5/ffffff?text=${encodeURIComponent(displayName)}`;
  }

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  return `/uploads/${imagePath}`;
}

export function isDisplayableImage(imagePath?: string): boolean {
  if (!imagePath) return false;

  return (
    imagePath.startsWith('/uploads/') ||
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://')
  );
}