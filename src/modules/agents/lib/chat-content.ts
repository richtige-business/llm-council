const CODE_BLOCK_PATTERN = /```/;
const TABLE_PATTERN = /(^|\n)\|.+\|\n\|(?:\s*[-:]+\s*\|)+/m;

export function isHeavyOrbContent(content: string): boolean {
  if (!content.trim()) {
    return false;
  }

  const lineCount = content.split('\n').length;
  return (
    CODE_BLOCK_PATTERN.test(content)
    || TABLE_PATTERN.test(content)
    || lineCount > 12
    || content.length > 700
  );
}
