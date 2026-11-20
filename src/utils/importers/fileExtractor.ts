export type SupportedImportFileKind = 'pdf' | 'docx' | 'txt' | 'json' | 'doc' | 'unsupported';

export type DocumentExtractionErrorCode =
  | 'SCANNED_PDF'
  | 'EMPTY_DOCUMENT'
  | 'CORRUPT_FILE'
  | 'UNSUPPORTED_FORMAT';

export class DocumentExtractionError extends Error {
  public readonly code: DocumentExtractionErrorCode;

  constructor(code: DocumentExtractionErrorCode, message: string) {
    super(message);
    this.name = 'DocumentExtractionError';
    this.code = code;
    Object.setPrototypeOf(this, DocumentExtractionError.prototype);
  }
}

export interface ExtractedDocumentResult {
  kind: 'pdf' | 'docx' | 'txt';
  text: string;
  pageCount?: number;
}

export function detectImportFileKind(file: Pick<File, 'name' | 'type'>): SupportedImportFileKind {
  const lowerName = (file.name || '').trim().toLowerCase();
  const mime = (file.type || '').trim().toLowerCase();

  if (lowerName.endsWith('.json') || mime === 'application/json') {
    return 'json';
  }
  if (lowerName.endsWith('.pdf') || mime === 'application/pdf') {
    return 'pdf';
  }
  if (
    lowerName.endsWith('.docx') ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  if (lowerName.endsWith('.doc') || mime === 'application/msword') {
    return 'doc';
  }
  if (lowerName.endsWith('.txt') || mime === 'text/plain') {
    return 'txt';
  }
  return 'unsupported';
}

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result: any = reader.result;
      const isArrayBufferLike =
        result instanceof ArrayBuffer ||
        Object.prototype.toString.call(result) === '[object ArrayBuffer]';
      if (isArrayBufferLike) {
        const bytes = new Uint8Array(result);
        resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
      } else {
        reject(new Error('Failed to read binary file contents.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsArrayBuffer(file);
  });
}

export function readFileAsUtf8Text(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read selected text file.'));
    reader.readAsText(file);
  });
}

function decodeHtmlEntities(input: string): string {
  const namedMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&ndash;': '–',
    '&mdash;': '—',
    '&bull;': '•',
    '&middot;': '·',
  };

  return input
    .replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp|ndash|mdash|bull|middot);/gi, (match) => {
      const lower = match.toLowerCase();
      return namedMap[lower] ?? match;
    })
    .replace(/&#(\d+);/g, (_m, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    });
}

export function convertMammothHtmlToResumeText(html: string): string {
  if (!html) return '';

  const structured = html
    .replace(/\r\n?/g, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:td|th)>\s*<(?:td|th)[^>]*>/gi, ' | ')
    .replace(/<\/(?:p|div|h[1-6]|tr|section|article|header|footer|ul|ol|table)>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  const decoded = decodeHtmlEntities(structured);

  return decoded
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function reconstructPdfPageLines(
  items: Array<{
    str?: string;
    transform?: number[];
    width?: number;
    hasEOL?: boolean;
  }>
): string {
  const lines: string[] = [];
  let currentLine = '';
  let lastY: number | null = null;
  let lastRightX: number | null = null;

  for (const item of items) {
    const rawStr = typeof item.str === 'string' ? item.str : '';
    const transform = Array.isArray(item.transform) ? item.transform : null;
    const x = transform && typeof transform[4] === 'number' ? transform[4] : null;
    const y = transform && typeof transform[5] === 'number' ? transform[5] : null;
    const width = typeof item.width === 'number' ? item.width : 0;

    if (lastY !== null && y !== null && Math.abs(y - lastY) > 2.5) {
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
      currentLine = '';
      lastRightX = null;
    }

    if (rawStr) {
      if (currentLine.length > 0 && !currentLine.endsWith(' ') && !rawStr.startsWith(' ')) {
        if (lastRightX !== null && x !== null && x - lastRightX > 2) {
          currentLine += ' ';
        } else if (lastRightX === null || x === null) {
          currentLine += ' ';
        }
      }
      currentLine += rawStr;
    }

    if (y !== null) {
      lastY = y;
    }
    if (x !== null) {
      lastRightX = x + Math.max(width, 0);
    }

    if (item.hasEOL) {
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
      currentLine = '';
      lastY = null;
      lastRightX = null;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines.join('\n');
}

async function extractPdfText(file: File): Promise<ExtractedDocumentResult> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new DocumentExtractionError(
      'EMPTY_DOCUMENT',
      'The selected PDF file is empty. Please upload a valid PDF, DOCX, or TXT file, or paste your resume text.'
    );
  }

  const isJestEnv =
    typeof process !== 'undefined' && Boolean(process.env && process.env.JEST_WORKER_ID);

  const pdfjsModule = await import('pdfjs-dist/legacy/build/pdf');
  const pdfjs: any = (pdfjsModule as any).default || pdfjsModule;

  if (!isJestEnv && typeof window !== 'undefined' && pdfjs?.GlobalWorkerOptions) {
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      try {
        const workerEntry = await import('pdfjs-dist/legacy/build/pdf.worker.entry');
        const resolvedWorker = (workerEntry as any).default || workerEntry;
        if (typeof resolvedWorker === 'string' && resolvedWorker) {
          pdfjs.GlobalWorkerOptions.workerSrc = resolvedWorker;
        }
      } catch {
        // Fallback to main-thread fake worker if bundler worker entry is unavailable
      }
    }
  }

  let pdfDoc: any;
  try {
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
      disableWorker: isJestEnv || !pdfjs?.GlobalWorkerOptions?.workerSrc,
      useSystemFonts: true,
      isEvalSupported: false,
    });
    pdfDoc = await loadingTask.promise;
  } catch {
    throw new DocumentExtractionError(
      'CORRUPT_FILE',
      'Unable to read this PDF file. It may be password-protected or corrupted. Please upload a DOCX/TXT file or paste your resume text.'
    );
  }

  const pageCount: number = typeof pdfDoc?.numPages === 'number' ? pdfDoc.numPages : 0;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum += 1) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = Array.isArray(textContent?.items) ? textContent.items : [];
    const pageText = reconstructPdfPageLines(items);
    if (pageText.trim()) {
      pageTexts.push(pageText.trim());
    }
  }

  const combinedText = pageTexts.join('\n\n').trim();
  const nonWhitespaceCount = combinedText.replace(/\s+/g, '').length;

  if (nonWhitespaceCount < 15) {
    throw new DocumentExtractionError(
      'SCANNED_PDF',
      'This PDF appears to be a scanned image with an empty text layer. Please upload a Word (.docx) file or paste your resume text instead.'
    );
  }

  return {
    kind: 'pdf',
    text: combinedText,
    pageCount,
  };
}

async function extractDocxText(file: File): Promise<ExtractedDocumentResult> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new DocumentExtractionError(
      'EMPTY_DOCUMENT',
      'The selected Word (.docx) file is empty. Please upload another file or paste your resume text.'
    );
  }

  const mammothModule = await import('mammoth');
  const mammoth: any = (mammothModule as any).default || mammothModule;

  const isNodeBufferAvailable =
    typeof process !== 'undefined' &&
    Boolean(process.env && process.env.JEST_WORKER_ID) &&
    typeof Buffer !== 'undefined';

  const input = isNodeBufferAvailable
    ? { buffer: Buffer.from(arrayBuffer), arrayBuffer }
    : { arrayBuffer };

  let extractedText = '';
  try {
    if (typeof mammoth.convertToHtml === 'function') {
      const htmlResult = await mammoth.convertToHtml(input);
      extractedText = convertMammothHtmlToResumeText(htmlResult?.value || '');
    }
    if (!extractedText && typeof mammoth.extractRawText === 'function') {
      const rawResult = await mammoth.extractRawText(input);
      extractedText = (rawResult?.value || '').replace(/\r\n?/g, '\n').trim();
    }
  } catch {
    throw new DocumentExtractionError(
      'CORRUPT_FILE',
      'Unable to extract text from this Word (.docx) file. Please verify the file is a valid .docx document or paste your resume text.'
    );
  }

  if (extractedText.replace(/\s+/g, '').length < 5) {
    throw new DocumentExtractionError(
      'EMPTY_DOCUMENT',
      'No readable text was found in this Word (.docx) document. Please upload another file or paste your resume text.'
    );
  }

  return {
    kind: 'docx',
    text: extractedText,
  };
}

async function extractPlainText(file: File): Promise<ExtractedDocumentResult> {
  const raw = await readFileAsUtf8Text(file);
  const normalized = (raw || '').replace(/\r\n?/g, '\n').trim();

  if (!normalized) {
    throw new DocumentExtractionError(
      'EMPTY_DOCUMENT',
      'The selected text (.txt) file is empty. Please choose a non-empty file or paste your resume text.'
    );
  }

  return {
    kind: 'txt',
    text: normalized,
  };
}

/**
 * Client-side browser extraction for PDF, DOCX, and TXT resume files.
 * Uses dynamic imports for PDF and DOCX parsers so initial page load bundles stay small.
 */
export async function extractTextFromDocumentFile(
  file: File
): Promise<ExtractedDocumentResult> {
  const kind = detectImportFileKind(file);

  if (kind === 'pdf') {
    return extractPdfText(file);
  }
  if (kind === 'docx') {
    return extractDocxText(file);
  }
  if (kind === 'txt') {
    return extractPlainText(file);
  }
  if (kind === 'doc') {
    throw new DocumentExtractionError(
      'UNSUPPORTED_FORMAT',
      'Legacy .doc files are not supported in the browser. Please save the document as .docx or .pdf, or paste your resume text.'
    );
  }

  throw new DocumentExtractionError(
    'UNSUPPORTED_FORMAT',
    'Unsupported file format. Please upload a PDF (.pdf), Word (.docx), Plain Text (.txt), or JSON Resume (.json) file.'
  );
}
