import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import dedent from 'dedent';
import type {QueryContextProvider, QueryState} from './interface.js';

export class AgentsMdProvider implements QueryContextProvider {
    async provide(state: QueryState): Promise<string> {
        const filePath = path.join(state.cwd, 'AGENTS.md');
        if (!existsSync(filePath)) {
            return '';
        }
        const content = await fs.readFile(filePath, 'utf8');
        return dedent`
            <always-applied-rule path="AGENTS.md">
            ${content}
            </always-applied-rule>
        `;
    }
}
