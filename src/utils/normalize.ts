/**
 * Vietnamese diacritics map for unaccented string conversion
 */
export function removeVietnameseDiacritics(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Normalizes a song title for reliable deduplication & matching.
 * Handles:
 * - Unicode NFC normalization
 * - Lowercase
 * - Leading/trailing and multiple spaces
 * - Common brackets / decorators without destructive fuzzy alteration
 * - Vietnamese diacritics removal for matching
 */
export function normalizeSongTitle(rawTitle: string): string {
  if (!rawTitle) return '';

  let title = rawTitle.normalize('NFC').toLowerCase().trim();

  // Remove common karaoke / cover / remix / mv decorators inside parentheses/brackets
  title = title
    .replace(/\s*[\(\[\{][^\)\]\}]*(?:karaoke|beat|instrumental|official|mv|audio|lyric|lyrics|cover|video|remix)[^\)\]\}]*[\)\]\}]\s*/gi, ' ')
    .replace(/[«»""''`]/g, '')
    .replace(/[-_–—]/g, ' ')
    .replace(/[!?,.:;~#$^*+=]/g, ' ');

  // Collapse multiple whitespaces
  title = title.replace(/\s+/g, ' ').trim();

  // Strip diacritics for uniform matching (e.g. "Nơi này có anh" -> "noi nay co anh")
  return removeVietnameseDiacritics(title);
}

/**
 * Normalizes artist name
 */
export function normalizeArtist(rawArtist: string = ''): string {
  if (!rawArtist) return '';
  const cleaned = rawArtist.normalize('NFC').toLowerCase().trim().replace(/\s+/g, ' ');
  return removeVietnameseDiacritics(cleaned);
}

/**
 * Generates unique composite matching key for deduplication
 */
export function generateSongKey(title: string, artist: string = ''): string {
  const normTitle = normalizeSongTitle(title);
  const normArtist = normalizeArtist(artist);
  return normArtist ? `${normTitle}__${normArtist}` : normTitle;
}

/**
 * Clean display title (preserves proper Vietnamese accents & casing)
 */
export function cleanDisplayString(str: string): string {
  if (!str) return '';
  return str.normalize('NFC').trim().replace(/\s+/g, ' ');
}

/**
 * Case-insensitive & accent-insensitive search utility.
 * Matches both "noi nay" -> "Nơi này có anh" and exact query.
 */
export function matchesSearchQuery(text: string, query: string): boolean {
  if (!query || !query.trim()) return true;
  if (!text) return false;

  const normalizedQuery = removeVietnameseDiacritics(query.toLowerCase().trim());
  const normalizedText = removeVietnameseDiacritics(text.toLowerCase().trim());

  return normalizedText.includes(normalizedQuery);
}
