/**
 * zipper.ts
 * Extracts images from a PDF and bundles them into a zip.
 * Images are named punchlist-item-{originalIndex}{a,b,c…}
 * Only extracts images from pages that contain our punch items.
 */

import * as pdfjsLib from 'pdfjs-dist';
import { zipSync, strToU8 } from 'fflate';
import type { PunchItem } from './parser';

interface ExtractedImage {
  name: string;
  data: Uint8Array;
}

interface PDFObjectStore {
  has(id: string): boolean;
  get(id: string): unknown;
}

interface RawImageData {
  data: Uint8ClampedArray | null;
  width?: number;
  height?: number;
  kind?: number;
}

/**
 * Extract raw images from a single PDF page using the operator list.
 * Returns array of Uint8Array image data (JPEG or PNG).
 */
async function extractImagesFromPage(
  page: pdfjsLib.PDFPageProxy,
): Promise<Uint8Array[]> {
  const images: Uint8Array[] = [];

  try {
    const opList = await page.getOperatorList();
    const commonObjs = (page as unknown as { commonObjs: PDFObjectStore }).commonObjs;
    const objs = (page as unknown as { objs: PDFObjectStore }).objs;

    for (let i = 0; i < opList.fnArray.length; i++) {
      // OPS.paintImageXObject = 85, paintImageXObjectRepeat = 88
      const fn = opList.fnArray[i];
      if (fn !== pdfjsLib.OPS.paintImageXObject && fn !== 88) continue;

      const args = opList.argsArray[i];
      if (!args || !args[0]) continue;
      const objId = args[0] as string;

      let imgData: RawImageData | null = null;

      // Try page-level objects first, then common objects
      try {
        if (objs.has(objId)) {
          imgData = objs.get(objId) as RawImageData;
        } else if (commonObjs.has(objId)) {
          imgData = commonObjs.get(objId) as RawImageData;
        }
      } catch {
        continue;
      }

      if (!imgData || !imgData.data) continue;

      // imgData.data is raw RGBA bytes — encode as JPEG via canvas
      try {
        const canvas = document.createElement('canvas');
        canvas.width = imgData.width ?? 1;
        canvas.height = imgData.height ?? 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        const imageData = ctx.createImageData(canvas.width, canvas.height);
        imageData.data.set(imgData.data);
        ctx.putImageData(imageData, 0, 0);

        const blob = await new Promise<Blob | null>(resolve =>
          canvas.toBlob(resolve, 'image/jpeg', 0.92)
        );
        if (!blob) continue;

        const arrayBuffer = await blob.arrayBuffer();
        images.push(new Uint8Array(arrayBuffer));
      } catch {
        continue;
      }
    }
  } catch {
    // Page may not have an operator list — skip silently
  }

  return images;
}

/**
 * Build a zip file containing:
 * - images named punchlist-item-{n}{a,b,c…}.jpg
 * - a manifest.txt listing item number → filename
 */
export async function buildImageZip(
  file: File,
  items: PunchItem[],
): Promise<Blob | null> {
  if (items.length === 0) return null;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // Map page → items on that page
  const pageToItems = new Map<number, PunchItem[]>();
  for (const item of items) {
    if (!pageToItems.has(item.pageNumber)) pageToItems.set(item.pageNumber, []);
    pageToItems.get(item.pageNumber)!.push(item);
  }

  const extractedImages: ExtractedImage[] = [];
  const manifestLines: string[] = ['Punch List Image Manifest', '─'.repeat(40)];

  // Process only pages that contain our items
  const pagesToProcess = Array.from(pageToItems.keys()).sort((a, b) => a - b);

  for (const pageNum of pagesToProcess) {
    const page = await pdf.getPage(pageNum);
    const pageImages = await extractImagesFromPage(page);
    page.cleanup();

    const pageItems = pageToItems.get(pageNum)!;

    // Distribute images across items on this page
    // Simple approach: if multiple items on same page, first item gets first image, etc.
    // If more images than items, they all go to the first item on that page
    for (let imgIdx = 0; imgIdx < pageImages.length; imgIdx++) {
      const targetItem = pageItems[Math.min(imgIdx, pageItems.length - 1)];
      const letter = String.fromCharCode(
        97 + extractedImages.filter(e =>
          e.name.startsWith(`punchlist-item-${targetItem.originalIndex}`)
        ).length
      );
      const name = `punchlist-item-${targetItem.originalIndex}${letter}.jpg`;
      extractedImages.push({ name, data: pageImages[imgIdx] });
      manifestLines.push(`Item ${targetItem.originalIndex}: ${name}`);
    }
  }

  if (extractedImages.length === 0) return null;

  // Build zip
  const zipEntries: Record<string, Uint8Array> = {};
  for (const img of extractedImages) {
    zipEntries[img.name] = img.data;
  }
  zipEntries['manifest.txt'] = strToU8(manifestLines.join('\n'));

  const zipped = zipSync(zipEntries, { level: 1 }); // level 1 = fast, jpegs don't compress
  return new Blob([zipped], { type: 'application/zip' });
}
