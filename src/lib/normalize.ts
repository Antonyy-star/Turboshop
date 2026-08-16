/**
 * Strips formatting separators and lowercases for article-number comparison.
 * "715910-0001-R" → "7159100001r"
 * "715910 0001 R" → "7159100001r"
 * "7159100001R"   → "7159100001r"
 */
export function normalizeArticle(s: string): string {
  return s.toLowerCase().replace(/[-\s./\\|_]+/g, "");
}
