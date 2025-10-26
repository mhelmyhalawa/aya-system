// Utilities for Top Achievers image naming and validation.
// Pattern: YYYYMM-RR-StudentSlug.ext
// Example: 202510-01-أحمد-خالد.jpg (Year 2025, Month 10, Rank 01, Student Name)
// Arabic letters kept, spaces converted to hyphens, English alphanumerics preserved.
// Allowed extensions: .png .jpg .jpeg

const EXT_ALLOWED = ['png','jpg','jpeg'];

// Normalize and slugify Arabic/English student name
export function slugifyStudentName(name: string): string {
  return name
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\-\u0600-\u06FF]+/g, '') // keep Arabic letters, numbers, underscores removed except hyphen
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60); // length cap
}

export function padRank(rank: number): string {
  return rank < 10 ? `0${rank}` : String(rank).slice(0,2);
}

export function generateTopAchieverFilename(date: Date, rank: number, studentName: string, originalExt: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const yyyymm = `${year}${month.toString().padStart(2,'0')}`;
  const rankPart = padRank(rank);
  const ext = normalizeExtension(originalExt);
  const slug = slugifyStudentName(studentName) || 'مجهول';
  return `${yyyymm}-${rankPart}-${slug}.${ext}`;
}

export function normalizeExtension(ext: string): string {
  const clean = ext.replace(/^\./,'').toLowerCase();
  return EXT_ALLOWED.includes(clean) ? clean : 'jpg';
}

export const TOP_ACHIEVER_FILENAME_REGEX = /^(\d{6})-(\d{2})-([\w\-\u0600-\u06FF]{1,60})\.(png|jpg|jpeg)$/;

export interface ParsedAchieverFilename {
  year: number; month: number; rank: number; studentSlug: string; ext: string; valid: boolean; original: string;
}

export function parseTopAchieverFilename(filename: string): ParsedAchieverFilename | null {
  const match = filename.match(TOP_ACHIEVER_FILENAME_REGEX);
  if (!match) return null;
  const [original, yyyymm, rr, slug, ext] = match;
  const year = Number(yyyymm.slice(0,4));
  const month = Number(yyyymm.slice(4));
  const rank = Number(rr);
  return { year, month, rank, studentSlug: slug, ext, valid: true, original };
}

export function validateTopAchieverFilename(filename: string): boolean {
  return TOP_ACHIEVER_FILENAME_REGEX.test(filename);
}

// Suggest next rank filename given existing filenames and a student name
export function suggestNextFilename(existing: string[], studentName: string, date = new Date()): string {
  const parsed = existing
    .map(parseTopAchieverFilename)
    .filter(Boolean) as ParsedAchieverFilename[];
  const ranksUsed = new Set(parsed.map(p => p.rank));
  let nextRank = 1;
  while (ranksUsed.has(nextRank) && nextRank < 99) nextRank++;
  return generateTopAchieverFilename(date, nextRank, studentName, 'jpg');
}

// Ensure uniqueness by appending incremental suffix if collision found
export function ensureUniqueFilename(target: string, existing: string[]): string {
  if (!existing.includes(target)) return target;
  const base = target.replace(/\.(png|jpg|jpeg)$/,'');
  const ext = target.split('.').pop() || 'jpg';
  let i = 2;
  let attempt = `${base}-${i}.${ext}`;
  while (existing.includes(attempt) && i < 50) {
    i++;
    attempt = `${base}-${i}.${ext}`;
  }
  return attempt;
}

// Create a display label for UI
export function filenameDisplayLabel(filename: string): string {
  const parsed = parseTopAchieverFilename(filename);
  if (!parsed) return filename;
  return `📅 ${parsed.year}/${parsed.month} | 🏅 ترتيب ${parsed.rank} | 👤 ${parsed.studentSlug}`;
}

export default {
  slugifyStudentName,
  padRank,
  generateTopAchieverFilename,
  normalizeExtension,
  parseTopAchieverFilename,
  validateTopAchieverFilename,
  suggestNextFilename,
  ensureUniqueFilename,
  filenameDisplayLabel
};
