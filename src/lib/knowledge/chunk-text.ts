const DEFAULT_CHUNK_SIZE = 1800;
const OVERLAP = 200;

export function splitTextIntoChunks(
  text: string,
  maxChunk = DEFAULT_CHUNK_SIZE
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChunk) return [trimmed];

  const paragraphs = trimmed.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    const next = current ? `${current}\n\n${para}` : para;
    if (next.length <= maxChunk) {
      current = next;
      continue;
    }

    if (current) chunks.push(current);

    if (para.length > maxChunk) {
      for (let i = 0; i < para.length; i += maxChunk - OVERLAP) {
        chunks.push(para.slice(i, i + maxChunk));
      }
      current = "";
    } else {
      current = para;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
