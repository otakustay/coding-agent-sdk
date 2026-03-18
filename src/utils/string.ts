interface TruncateTextOptions {
    maxLines?: number;
    maxCharactersPerLine?: number;
    from?: 'head' | 'tail';
    onTruncate?: (truncated: string) => string;
}

export function truncateLine(line: string, maxCharacters: number): string {
    return line.length > maxCharacters ? line.slice(0, maxCharacters) + '...' : line;
}

export function truncateText(text: string, options: TruncateTextOptions = {}): string {
    const {maxLines, maxCharactersPerLine, from = 'head', onTruncate} = options;

    const lines = text.split('\n');
    const perLineTruncated = typeof maxCharactersPerLine === 'number'
        ? lines.map(line => truncateLine(line, maxCharactersPerLine))
        : lines;

    if (maxLines !== undefined && perLineTruncated.length > maxLines) {
        const truncated = from === 'tail'
            ? perLineTruncated.slice(-maxLines).join('\n')
            : perLineTruncated.slice(0, maxLines).join('\n');
        return onTruncate ? onTruncate(truncated) : truncated;
    }

    return perLineTruncated.join('\n');
}

export function parseJsonSafe(text: string, fallback: unknown = {}): unknown {
    try {
        return JSON.parse(text);
    }
    catch {
        return fallback;
    }
}
