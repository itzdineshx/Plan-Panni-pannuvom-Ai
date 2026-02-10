import { FileAttachment } from '../types';

// ─── File Upload Service ────────────────────────────────────────────────────
// Uses Cloudinary unsigned upload or falls back to local blob URLs for demo.
// Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env to enable cloud uploads.

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
const USE_CLOUDINARY = Boolean(CLOUD_NAME && UPLOAD_PRESET);

function getFileType(file: File): FileAttachment['type'] {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf') return 'pdf';
  if (
    file.type.includes('document') ||
    file.type.includes('word') ||
    file.type.includes('spreadsheet') ||
    file.type.includes('presentation') ||
    file.type.includes('text/')
  )
    return 'document';
  return 'other';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/** Upload a file and return an attachment record */
export async function uploadFile(
  file: File,
  uploadedBy: string = 'Current User'
): Promise<FileAttachment> {
  const maxSize = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxSize) {
    throw new Error(`File too large (${formatBytes(file.size)}). Max is 10 MB.`);
  }

  let url: string;
  let thumbnailUrl: string | undefined;

  if (USE_CLOUDINARY) {
    // ── Cloudinary unsigned upload ──
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'Plan Panni Pannuvom-attachments');

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
      { method: 'POST', body: formData }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Upload failed: ${err}`);
    }

    const data = await res.json();
    url = data.secure_url;
    if (file.type.startsWith('image/')) {
      // Generate thumbnail transformation
      thumbnailUrl = data.secure_url.replace('/upload/', '/upload/c_thumb,w_200,h_200/');
    }
    if (file.type === 'application/pdf') {
      thumbnailUrl = data.secure_url.replace('/upload/', '/upload/pg_1,c_thumb,w_200,h_200/') + '.jpg';
    }
  } else {
    // ── Fallback: local blob URL (works in-memory, no server needed) ──
    url = URL.createObjectURL(file);
    if (file.type.startsWith('image/')) {
      thumbnailUrl = url;
    }
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    name: file.name,
    url,
    type: getFileType(file),
    size: file.size,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
    thumbnailUrl,
  };
}

/** Read a file and return as data URL (for previews) */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/** Get icon info for attachment types */
export function getAttachmentIcon(type: FileAttachment['type']): { emoji: string; color: string } {
  switch (type) {
    case 'image':
      return { emoji: '🖼️', color: 'text-emerald-600 bg-emerald-50' };
    case 'pdf':
      return { emoji: '📄', color: 'text-red-600 bg-red-50' };
    case 'document':
      return { emoji: '📝', color: 'text-blue-600 bg-blue-50' };
    default:
      return { emoji: '📎', color: 'text-slate-600 bg-slate-50' };
  }
}

/** Format file size for display */
export { formatBytes };
