import {
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
  SUPPORTED_FILE_TYPES,
  SUPPORTED_IMAGE_TYPES,
} from '../constants';
import type { AttachedFile, AttachedImage, ChatMessageData } from '../types';

type AttachmentCarrier = {
  images?: AttachedImage[];
  files?: AttachedFile[];
};

type AttachmentFileLike = {
  name: string;
  size: number;
  type: string;
};

type RelativePathFile = File & { webkitRelativePath?: string };

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
const FILE_EXTENSIONS = new Set(['txt', 'md', 'csv', 'json', 'pdf']);
const TEXT_FILE_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  csv: 'text/csv',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  json: 'application/json',
  md: 'text/markdown',
  pdf: 'application/pdf',
  png: 'image/png',
  txt: 'text/plain',
  webp: 'image/webp',
};

export const COMBINED_ATTACHMENT_ACCEPT = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_FILE_TYPES,
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.pdf',
].join(',');

function getFileExtension(fileName: string): string {
  const extension = fileName.split('.').pop();
  return extension ? extension.trim().toLowerCase() : '';
}

function inferMimeType(fileName: string): string {
  const extension = getFileExtension(fileName);
  return MIME_BY_EXTENSION[extension] || '';
}

function resolveMimeType(fileLike: AttachmentFileLike): string {
  return fileLike.type || inferMimeType(fileLike.name);
}

function isImageExtension(fileName: string): boolean {
  return IMAGE_EXTENSIONS.has(getFileExtension(fileName));
}

function isSupportedImageFile(fileLike: AttachmentFileLike): boolean {
  if (fileLike.size > MAX_IMAGE_SIZE) {
    return false;
  }

  const mimeType = resolveMimeType(fileLike);
  return SUPPORTED_IMAGE_TYPES.includes(mimeType) || isImageExtension(fileLike.name);
}

function isSupportedDocumentFile(fileLike: AttachmentFileLike): boolean {
  if (fileLike.size > MAX_FILE_SIZE) {
    return false;
  }

  const mimeType = resolveMimeType(fileLike);
  return SUPPORTED_FILE_TYPES.includes(mimeType) || FILE_EXTENSIONS.has(getFileExtension(fileLike.name));
}

function isTextReadableFile(fileLike: AttachmentFileLike): boolean {
  const mimeType = resolveMimeType(fileLike);
  return TEXT_FILE_TYPES.has(mimeType);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error(`Datei konnte nicht gelesen werden: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error(`Datei konnte nicht gelesen werden: ${file.name}`));
    reader.readAsText(file);
  });
}

async function readImageAttachment(file: File): Promise<AttachedImage | null> {
  if (!isSupportedImageFile(file)) {
    return null;
  }

  const dataUrl = await readFileAsDataUrl(file);
  const base64 = dataUrl.split(',')[1] || '';
  const displayName = (file as RelativePathFile).webkitRelativePath?.trim() || file.name;
  const mimeType = resolveMimeType({ name: displayName, size: file.size, type: file.type });

  return {
    id: crypto.randomUUID(),
    name: displayName,
    type: mimeType,
    size: file.size,
    base64,
    previewUrl: URL.createObjectURL(file),
  };
}

async function readDocumentAttachment(file: File): Promise<AttachedFile | null> {
  if (!isSupportedDocumentFile(file)) {
    return null;
  }

  const displayName = (file as RelativePathFile).webkitRelativePath?.trim() || file.name;
  const mimeType = resolveMimeType({ name: displayName, size: file.size, type: file.type });

  if (isTextReadableFile({ name: displayName, size: file.size, type: mimeType })) {
    const content = await readFileAsText(file);
    return {
      id: crypto.randomUUID(),
      name: displayName,
      type: mimeType,
      size: file.size,
      content,
    };
  }

  const dataUrl = await readFileAsDataUrl(file);

  return {
    id: crypto.randomUUID(),
    name: displayName,
    type: mimeType,
    size: file.size,
    url: dataUrl,
  };
}

function getFilesFromDataTransfer(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) {
    return [];
  }

  if (dataTransfer.items?.length) {
    return Array.from(dataTransfer.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
  }

  return Array.from(dataTransfer.files || []);
}

export async function readAttachmentsFromFiles(
  filesInput: FileList | File[] | null | undefined
): Promise<{ images: AttachedImage[]; files: AttachedFile[] }> {
  const files = filesInput ? Array.from(filesInput) : [];
  const images: AttachedImage[] = [];
  const attachments: AttachedFile[] = [];

  for (const file of files) {
    const imageAttachment = await readImageAttachment(file);
    if (imageAttachment) {
      images.push(imageAttachment);
      continue;
    }

    const documentAttachment = await readDocumentAttachment(file);
    if (documentAttachment) {
      attachments.push(documentAttachment);
    }
  }

  return { images, files: attachments };
}

export async function readAttachmentsFromClipboardData(
  clipboardData: DataTransfer | null
): Promise<{ images: AttachedImage[]; files: AttachedFile[] }> {
  return readAttachmentsFromFiles(getFilesFromDataTransfer(clipboardData));
}

export async function readAttachmentsFromDropData(
  dataTransfer: DataTransfer | null
): Promise<{ images: AttachedImage[]; files: AttachedFile[] }> {
  return readAttachmentsFromFiles(getFilesFromDataTransfer(dataTransfer));
}

export function revokeImagePreviewUrls(images?: AttachedImage[]) {
  for (const image of images || []) {
    if (image.previewUrl) {
      URL.revokeObjectURL(image.previewUrl);
    }
  }
}

export function stripTransientAttachmentFieldsFromImages(
  images?: AttachedImage[],
): AttachedImage[] | undefined {
  if (!images?.length) {
    return undefined;
  }

  return images.map((image) => {
    const nextImage = { ...image };
    delete nextImage.previewUrl;
    return nextImage;
  });
}

export function stripTransientAttachmentFieldsFromMessage<T extends AttachmentCarrier>(message: T): T {
  if (!message.images?.length) {
    return message;
  }

  return {
    ...message,
    images: stripTransientAttachmentFieldsFromImages(message.images),
  };
}

export function stripTransientAttachmentFieldsFromMessages<T extends AttachmentCarrier>(
  messages: T[],
): T[] {
  return messages.map((message) => stripTransientAttachmentFieldsFromMessage(message));
}

export function formatAttachmentFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function serializeChatMessageForModel(
  message: Pick<ChatMessageData, 'content' | 'images' | 'files'>,
): string {
  const fileSummaries = (message.files || []).map((file) => {
    const extractedContent = file.content?.trim();
    if (extractedContent) {
      return `Datei "${file.name}": ${extractedContent.slice(0, 1500)}`;
    }
    return `Datei "${file.name}" (${file.type}, ${file.size} Bytes)`;
  });

  const imageSummaries = (message.images || []).map(
    (image) => `Bild "${image.name}" (${image.type}, ${image.size} Bytes)`,
  );

  const attachmentNotes = [...imageSummaries, ...fileSummaries];
  if (attachmentNotes.length === 0) {
    return message.content;
  }

  const baseContent = message.content?.trim() || '';
  const attachmentsBlock = `\n\n[Anhänge]\n${attachmentNotes.join('\n')}`;
  return `${baseContent}${attachmentsBlock}`.trim();
}
