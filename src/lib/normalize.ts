/**
 * Strips formatting separators and lowercases for article/reference number comparison.
 * "715910-0001-R" → "7159100001r"
 * "715910 0001 R" → "7159100001r"
 * "7159100001R"   → "7159100001r"
 * "770116-0002"   → "7701160002"
 */
export function normalizeRef(s: string): string {
  return s.toLowerCase().replace(/[-\s./\\|_]+/g, "");
}

export { normalizeRef as normalizeArticle };
