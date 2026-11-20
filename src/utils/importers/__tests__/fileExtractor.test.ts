import { SectionType } from '../../../types/resume';
import {
  DocumentExtractionError,
  convertMammothHtmlToResumeText,
  detectImportFileKind,
  extractTextFromDocumentFile,
  parseResumeText,
} from '../index';

/**
 * Builds a valid minimal PDF 1.4 binary buffer with positioned lines of text
 * (or an empty content stream when `lines` is empty, simulating a scanned PDF).
 */
function buildMinimalPdfBuffer(lines: string[]): Uint8Array {
  const escapePdfText = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  let streamContent = '';
  if (lines.length > 0) {
    const ops: string[] = ['BT', '/F1 11 Tf'];
    let y = 760;
    for (const line of lines) {
      ops.push(`1 0 0 1 50 ${y} Tm (${escapePdfText(line)}) Tj`);
      y -= 16;
    }
    ops.push('ET');
    streamContent = ops.join('\n');
  }

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(streamContent, 'utf8')} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return new Uint8Array(Buffer.from(pdf, 'utf8'));
}

/**
 * Builds an uncompressed (STORE method 0) valid ZIP archive in memory so real
 * `mammoth` can extract an actual `.docx` OpenXML package end-to-end.
 */
function buildStoredZip(entries: Array<{ name: string; content: string }>): Uint8Array {
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }

  const crc32 = (buf: Buffer): number => {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i += 1) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };

  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const dataBuf = Buffer.from(entry.content, 'utf8');
    const crc = crc32(dataBuf);

    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8); // STORE
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(dataBuf.length, 18);
    localHeader.writeUInt32LE(dataBuf.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuf.copy(localHeader, 30);

    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(dataBuf.length, 20);
    centralHeader.writeUInt32LE(dataBuf.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    nameBuf.copy(centralHeader, 46);

    localParts.push(localHeader, dataBuf);
    centralParts.push(centralHeader);
    offset += localHeader.length + dataBuf.length;
  }

  const centralSize = centralParts.reduce((sum, b) => sum + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return new Uint8Array(Buffer.concat([...localParts, ...centralParts, eocd]));
}

function buildMinimalDocxBuffer(paragraphs: string[]): Uint8Array {
  const escapeXml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const pXml = paragraphs
    .map((p) => `<w:p><w:r><w:t>${escapeXml(p)}</w:t></w:r></w:p>`)
    .join('');

  return buildStoredZip([
    {
      name: '[Content_Types].xml',
      content:
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'word/document.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        `<w:body>${pXml}</w:body>` +
        '</w:document>',
    },
  ]);
}

describe('Client-side PDF, DOCX, and TXT Resume Extraction', () => {
  it('detects file kinds accurately by extension and MIME type', () => {
    expect(detectImportFileKind({ name: 'cv.pdf', type: '' })).toBe('pdf');
    expect(detectImportFileKind({ name: 'cv.DOCX', type: '' })).toBe('docx');
    expect(detectImportFileKind({ name: 'cv.txt', type: 'text/plain' })).toBe('txt');
    expect(detectImportFileKind({ name: 'resume.json', type: '' })).toBe('json');
    expect(detectImportFileKind({ name: 'legacy.doc', type: '' })).toBe('doc');
    expect(detectImportFileKind({ name: 'photo.png', type: 'image/png' })).toBe(
      'unsupported'
    );
  });

  it('extracts multi-line text from a real PDF and parses sections/items via parseResumeText', async () => {
    const pdfBytes = buildMinimalPdfBuffer([
      'Maya Lin',
      'Staff Backend Engineer',
      'maya.lin@example.com | (415) 555-0188 | San Francisco, CA',
      'Experience',
      'Nimbus Systems',
      'Staff Backend Engineer',
      'Jan 2021 - Present',
      '- Reduced p99 API latency by 44% across 80M daily requests',
      'Projects',
      'StreamForge',
      '- Built zero-copy Kafka ingestion service handling 150k msg/sec',
      'Skills',
      'Go, TypeScript, Kubernetes, PostgreSQL',
      'Education',
      'Stanford University',
      'M.S. in Computer Science',
      '2018 - 2020',
    ]);

    const pdfFile = new File([pdfBytes], 'maya-lin-resume.pdf', {
      type: 'application/pdf',
    });

    const extracted = await extractTextFromDocumentFile(pdfFile);
    expect(extracted.kind).toBe('pdf');
    expect(extracted.pageCount).toBe(1);
    expect(extracted.text).toContain('Maya Lin');
    expect(extracted.text).toContain('Reduced p99 API latency by 44%');

    const parsed = parseResumeText(extracted.text);
    expect(parsed.content.basics.name).toBe('Maya Lin');
    expect(parsed.content.basics.email).toBe('maya.lin@example.com');
    const sectionTypes = parsed.content.sections.map((s) => s.type);
    expect(sectionTypes).toEqual(
      expect.arrayContaining([
        SectionType.WORK,
        SectionType.PROJECTS,
        SectionType.SKILLS,
        SectionType.EDUCATION,
      ])
    );
  });

  it('rejects scanned PDFs with empty text layers with SCANNED_PDF message prompting DOCX or Paste Text', async () => {
    const scannedPdfBytes = buildMinimalPdfBuffer([]);
    const scannedFile = new File([scannedPdfBytes], 'scanned-cv.pdf', {
      type: 'application/pdf',
    });

    await expect(extractTextFromDocumentFile(scannedFile)).rejects.toThrow(
      DocumentExtractionError
    );

    try {
      await extractTextFromDocumentFile(scannedFile);
    } catch (err: any) {
      expect(err).toBeInstanceOf(DocumentExtractionError);
      expect(err.code).toBe('SCANNED_PDF');
      expect(err.message).toMatch(/scanned image|empty text layer/i);
      expect(err.message).toMatch(/\.docx/i);
      expect(err.message).toMatch(/paste/i);
    }
  });

  it('extracts text from a real .docx Word document and preserves list bullets', async () => {
    const docxBytes = buildMinimalDocxBuffer([
      'Elena Rostova',
      'Principal Data Engineer',
      'elena@example.com | New York, NY',
      'Experience',
      'Horizon Analytics',
      'Principal Data Engineer',
      'Mar 2020 - Present',
      '• Cut Spark pipeline runtime by 58% saving $210k annually',
      'Skills',
      'Python, SQL, Spark, Airflow',
    ]);

    const docxFile = new File([docxBytes], 'elena-resume.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const extracted = await extractTextFromDocumentFile(docxFile);
    expect(extracted.kind).toBe('docx');
    expect(extracted.text).toContain('Elena Rostova');
    expect(extracted.text).toContain('Cut Spark pipeline runtime by 58%');

    const parsed = parseResumeText(extracted.text);
    expect(parsed.content.basics.name).toBe('Elena Rostova');
    expect(parsed.content.basics.email).toBe('elena@example.com');
    expect(parsed.content.sections.some((s) => s.type === SectionType.WORK)).toBe(true);
    expect(parsed.content.sections.some((s) => s.type === SectionType.SKILLS)).toBe(true);
  });

  it('converts mammoth HTML <li> elements into bullet points for parseResumeText', () => {
    const html =
      '<h1>Projects</h1><p><strong>CloudPulse</strong></p><ul><li>Reduced cold start latency by 62%</li><li>Served 12k active tenants</li></ul>';
    const text = convertMammothHtmlToResumeText(html);
    expect(text).toContain('• Reduced cold start latency by 62%');
    expect(text).toContain('• Served 12k active tenants');
  });

  it('extracts UTF-8 plain text (.txt) files and rejects empty or legacy .doc files cleanly', async () => {
    const txtContent = [
      'Jordan Patel',
      'Senior Frontend Engineer',
      'jordan@example.com',
      '',
      'Skills',
      'React, TypeScript, GraphQL',
    ].join('\n');

    const txtFile = new File([txtContent], 'jordan.txt', { type: 'text/plain' });
    const res = await extractTextFromDocumentFile(txtFile);
    expect(res.kind).toBe('txt');
    expect(res.text).toContain('Jordan Patel');

    const emptyTxt = new File(['   '], 'empty.txt', { type: 'text/plain' });
    await expect(extractTextFromDocumentFile(emptyTxt)).rejects.toThrow(/empty/i);

    const legacyDoc = new File(['binary'], 'old.doc', { type: 'application/msword' });
    await expect(extractTextFromDocumentFile(legacyDoc)).rejects.toThrow(
      /Legacy \.doc files are not supported/i
    );
  });
});
