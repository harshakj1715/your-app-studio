/**
 * Converts markdown text into clean, natural speech text.
 * Strips symbols, formats tables conversationally, etc.
 */
export function markdownToSpeech(md: string): string {
  let text = md;

  // Handle markdown tables: convert to natural reading
  const tableRegex = /\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/g;
  text = text.replace(tableRegex, (_match, headerRow: string, bodyRows: string) => {
    const headers = headerRow
      .split('|')
      .map((h: string) => h.trim())
      .filter(Boolean);

    const rows = bodyRows
      .trim()
      .split('\n')
      .map((row: string) =>
        row
          .split('|')
          .map((c: string) => c.trim())
          .filter(Boolean)
      );

    let speech = 'Here is the table data. ';
    rows.forEach((cells: string[], i: number) => {
      const parts = cells.map((cell: string, j: number) =>
        headers[j] ? `${headers[j]} is ${cell}` : cell
      );
      speech += `Row ${i + 1}: ${parts.join(', ')}. `;
    });
    return speech;
  });

  // Remove markdown bold/italic markers
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');
  text = text.replace(/_(.+?)_/g, '$1');

  // Remove markdown headers
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Remove markdown links, keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove inline code backticks
  text = text.replace(/`([^`]+)`/g, '$1');

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');

  // Remove bullet points and list markers
  text = text.replace(/^[\s]*[-*+]\s+/gm, '');
  text = text.replace(/^[\s]*\d+\.\s+/gm, '');

  // Remove remaining pipe, plus, equal, dash sequences used as borders
  text = text.replace(/[|+:=]{2,}/g, '');
  text = text.replace(/[-]{3,}/g, '');

  // Remove stray single pipes
  text = text.replace(/\|/g, ', ');

  // Clean up extra whitespace
  text = text.replace(/\n{2,}/g, '. ');
  text = text.replace(/\n/g, ' ');
  text = text.replace(/\s{2,}/g, ' ');

  return text.trim();
}

/** Returns true if the message is long (>2 sentences) or contains a table */
export function shouldShowSpeaker(content: string): boolean {
  const hasTable = /\|.+\|/.test(content);
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  return hasTable || sentences.length > 2;
}
