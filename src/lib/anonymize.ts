/**
 * Anonymization pipeline for .docx submissions.
 *
 * A .docx is just a ZIP of XML. The author's name leaks via several
 * files inside:
 *   - docProps/core.xml         <dc:creator>, <cp:lastModifiedBy>
 *   - docProps/app.xml          <Company>
 *   - docProps/custom.xml       any custom property (rare)
 *   - word/document.xml         <w:rsid> revision-save IDs (machine fingerprint)
 *   - word/people.xml           comment author display names
 *   - word/comments.xml         <w:comment w:author="...">
 *
 * We scrub all of these by rewriting the ZIP through JSZip. The output is a
 * byte-for-byte clean .docx that opens fine in Word/Pages.
 *
 * Filenames are stripped at the upload layer (we save as `submission-<id>.docx`),
 * not here.
 */
import JSZip from "jszip";

const SCRUB_AUTHOR_TAGS = [
  /<dc:creator>[^<]*<\/dc:creator>/g,
  /<cp:lastModifiedBy>[^<]*<\/cp:lastModifiedBy>/g,
  /<Company>[^<]*<\/Company>/g,
  /<Manager>[^<]*<\/Manager>/g,
  /\sw:author="[^"]*"/g,
  /\sw:initials="[^"]*"/g,
];

function scrubXml(xml: string): string {
  let out = xml;
  for (const re of SCRUB_AUTHOR_TAGS) {
    out = out.replace(re, (match) => {
      // Preserve tag structure but blank the contents
      if (match.startsWith("<dc:")) return "<dc:creator></dc:creator>";
      if (match.startsWith("<cp:")) return "<cp:lastModifiedBy></cp:lastModifiedBy>";
      if (match.startsWith("<Company")) return "<Company></Company>";
      if (match.startsWith("<Manager")) return "<Manager></Manager>";
      if (match.startsWith(" w:author")) return ' w:author="anon"';
      if (match.startsWith(" w:initials")) return ' w:initials=""';
      return "";
    });
  }
  return out;
}

export async function anonymizeDocx(buf: ArrayBuffer): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(buf);
  const filesToScrub = [
    "docProps/core.xml",
    "docProps/app.xml",
    "docProps/custom.xml",
    "word/document.xml",
    "word/comments.xml",
    "word/people.xml",
    "word/header1.xml",
    "word/footer1.xml",
  ];
  for (const path of filesToScrub) {
    const entry = zip.file(path);
    if (!entry) continue;
    const xml = await entry.async("string");
    const cleaned = scrubXml(xml);
    zip.file(path, cleaned);
  }
  const out = await zip.generateAsync({
    type: "arraybuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return out;
}

/**
 * For .txt / .rtf there's no meaningful metadata to strip.
 * For .doc (binary Word) we'd need a separate library; rejected at upload.
 */
export async function anonymizeByFilename(filename: string, buf: ArrayBuffer): Promise<ArrayBuffer> {
  if (filename.toLowerCase().endsWith(".docx")) {
    return anonymizeDocx(buf);
  }
  return buf;
}
