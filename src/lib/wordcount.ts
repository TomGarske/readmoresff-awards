/**
 * Multi-format word counter for .txt, .rtf, and .docx.
 *
 * "Word" = run of non-whitespace characters separated by whitespace.
 * Matches Microsoft Word's behavior for typical prose with one exception:
 * hyphenated words count as one (Word: same). Em-dashes split words
 * (Word: same).
 *
 * For .docx: uses `mammoth` to extract raw text from the body. Strips
 * comments and footnotes (the contest rules say title page is excluded
 * but we count whatever is in the body — judges enforce title page).
 *
 * Returns 0 on parse failure. Callers should check for 0 before saving.
 */
import * as mammoth from "mammoth";

const mammothAvailable = typeof (mammoth as any).extractRawText === "function";

export type CountResult = {
  count: number;
  text: string;
  warnings: string[];
};

const STRIP_RTF = /\\(?:[a-zA-Z]+(?:-?\d+)?\s?|[^a-zA-Z0-9])|[{}]/g;
const COLLAPSE_WS = /\s+/g;

function countTokens(text: string): number {
  const cleaned = text.replace(COLLAPSE_WS, " ").trim();
  if (!cleaned) return 0;
  return cleaned.split(" ").length;
}

export async function countTxt(buf: ArrayBuffer): Promise<CountResult> {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  return { count: countTokens(text), text, warnings: [] };
}

export async function countRtf(buf: ArrayBuffer): Promise<CountResult> {
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  // Crude but effective: strip control words, braces, and hex escapes.
  // For real RTF complexity (embedded objects, tables) this misses edge
  // cases; flag a warning so the upload gets manual eyes.
  const text = raw.replace(STRIP_RTF, " ");
  const warnings: string[] = [];
  if (raw.includes("\\object") || raw.includes("\\pict")) {
    warnings.push("RTF contains embedded objects or pictures — count may be inexact");
  }
  return { count: countTokens(text), text, warnings };
}

export async function countDocx(buf: ArrayBuffer): Promise<CountResult> {
  if (!mammothAvailable) {
    return { count: 0, text: "", warnings: ["mammoth not loaded"] };
  }
  try {
    const result = await (mammoth as any).extractRawText({ arrayBuffer: buf });
    const text: string = result.value ?? "";
    const warnings: string[] = (result.messages ?? []).map((m: any) => m.message);
    return { count: countTokens(text), text, warnings };
  } catch (err: any) {
    return { count: 0, text: "", warnings: [`docx parse failed: ${err?.message ?? err}`] };
  }
}

export async function countByFilename(filename: string, buf: ArrayBuffer): Promise<CountResult> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".txt")) return countTxt(buf);
  if (lower.endsWith(".rtf")) return countRtf(buf);
  if (lower.endsWith(".docx")) return countDocx(buf);
  if (lower.endsWith(".doc")) {
    // .doc (binary Word ≤2003) needs a separate parser. Out of scope for v1.
    // Reject at the upload layer; if we got here, count what we can as raw bytes
    // and flag heavily.
    return {
      count: 0,
      text: "",
      warnings: [".doc (binary Word 97-2003) requires manual conversion — please re-save as .docx"],
    };
  }
  return { count: 0, text: "", warnings: [`unknown file type: ${filename}`] };
}

export function penaltyForOver(count: number, limit: number, penaltyAt: number, dqAt: number) {
  const over = Math.max(0, count - limit);
  if (over === 0) return { over: 0, penaltyPct: 0, dq: false };
  if (over >= dqAt) return { over, penaltyPct: 100, dq: true };
  if (over >= penaltyAt) return { over, penaltyPct: 0, dq: false };  // shouldn't hit (penaltyAt should = 1)
  return { over, penaltyPct: 10, dq: false };
}
