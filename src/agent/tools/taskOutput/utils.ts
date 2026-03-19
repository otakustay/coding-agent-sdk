export function formatOutput(
    output: string,
    statusText: string,
    offset: number | undefined,
    limit: number | undefined,
): string {
    if (!output) {
        return `Status: ${statusText}\nOutput: (no output yet)`;
    }

    const lines = output.replaceAll(/^\n+|\n+$/g, '').split('\n');
    const totalLines = lines.length;

    const startIndex = typeof offset === 'number'
        ? (
            offset >= 0
                ? Math.max(0, offset - 1)
                : Math.max(0, totalLines + offset)
        )
        : 0;

    const endIndex = typeof limit === 'number' ? Math.min(startIndex + limit, totalLines) : totalLines;

    const selectedLines = lines.slice(startIndex, endIndex);
    const addLineNumber = (line: string, i: number): string => {
        const lineNumber = startIndex + i + 1;
        return `${lineNumber.toString().padStart(6, ' ')}\t${line}`;
    };
    const formattedLines = selectedLines.map(addLineNumber);

    return [
        `Status: ${statusText}`,
        `Output (lines ${startIndex + 1}-${endIndex} of ${totalLines}):`,
        ...formattedLines,
    ]
        .join('\n');
}
