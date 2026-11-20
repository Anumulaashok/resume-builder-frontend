export type ExportFileFormat = "txt" | "pdf" | "docx";

export function buildFallbackExportFilename(
  rawTitle: string | undefined,
  ext: ExportFileFormat = "txt"
): string {
  const safeExt: ExportFileFormat =
    ext === "pdf" || ext === "docx" || ext === "txt" ? ext : "txt";
  const base = (rawTitle || "resume")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${base || "resume"}.${safeExt}`;
}

export function parseContentDispositionFilename(
  dispositionHeader: unknown,
  fallback: string
): string {
  if (typeof dispositionHeader !== "string" || !dispositionHeader.trim()) {
    return fallback;
  }

  const utf8Match = dispositionHeader.match(/filename\*=UTF-8''([^;\s]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      const decoded = decodeURIComponent(utf8Match[1]).trim();
      if (decoded) return decoded;
    } catch {
      // Fall through to standard filename match
    }
  }

  const asciiMatch = dispositionHeader.match(/filename="?([^";\r\n]+)"?/i);
  if (asciiMatch && asciiMatch[1]) {
    const cleaned = asciiMatch[1].trim();
    if (cleaned) return cleaned;
  }

  return fallback;
}

export function triggerFileDownload(blob: Blob, filename: string): void {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  if (typeof URL.revokeObjectURL === "function") {
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 0);
  }
}
