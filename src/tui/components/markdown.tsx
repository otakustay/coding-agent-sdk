import {Suspense, use} from 'react';
import {Text} from 'ink';
import {marked} from 'marked';
import type {MarkedExtension} from 'marked';
import {markedTerminal} from 'marked-terminal';

marked.use(markedTerminal() as unknown as MarkedExtension);

interface MarkdownContentProps {
    content: string;
    dimColor?: true;
}

function MarkdownContent({content, dimColor}: MarkdownContentProps) {
    const result = marked(content);
    const rendered = (result instanceof Promise ? use(result) : result).trimEnd();
    return rendered ? <Text {...(dimColor ? {dimColor} : {})}>{rendered}</Text> : null;
}

export function Markdown({content, dimColor}: MarkdownContentProps) {
    if (!content) {
        return null;
    }

    const dimProp = dimColor ? {dimColor} : {};
    return (
        <Suspense fallback={<Text {...dimProp}>{content}</Text>}>
            <MarkdownContent content={content} {...dimProp} />
        </Suspense>
    );
}
