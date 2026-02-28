interface TruncateTextOptions {
    maxLines?: number;
    maxCharactersPerLine?: number;
    maxTotalCharacters?: number;
    onTruncate?: (truncated: string) => string;
}

export function truncateLine(line: string, maxCharacters: number): string {
    return line.length > maxCharacters ? line.slice(0, maxCharacters) + '...' : line;
}

export function truncateText(text: string, options: TruncateTextOptions = {}): string {
    const {maxLines, maxCharactersPerLine, maxTotalCharacters, onTruncate} = options;

    const lines = text.split('\n');
    const perLineTruncated = typeof maxCharactersPerLine === 'number'
        ? lines.map(line => truncateLine(line, maxCharactersPerLine))
        : lines;

    if (maxLines !== undefined && perLineTruncated.length > maxLines) {
        const truncated = perLineTruncated.slice(-maxLines).join('\n');
        return onTruncate ? onTruncate(truncated) : '...truncated...\n' + truncated;
    }

    const joined = perLineTruncated.join('\n');

    if (maxTotalCharacters !== undefined && joined.length > maxTotalCharacters) {
        const truncated = joined.slice(0, maxTotalCharacters);
        return onTruncate ? onTruncate(truncated) : truncated;
    }

    return joined;
}
