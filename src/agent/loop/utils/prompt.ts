import dedent from 'dedent';

export function error(content: string): string {
    return dedent`
        <error>
        ${content}
        </error>
    `;
}
