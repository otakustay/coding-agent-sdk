import {execa} from 'execa';
import dedent from 'dedent';
import type {BashToolParameters} from './definition.js';
import type {ToolImplementation} from '../interface.js';

const MAX_LINE_LENGTH = 2000;
const MAX_OUTPUT = 30_000;

export async function createBashImplement(): Promise<ToolImplementation<BashToolParameters>> {
    return async (parameters): Promise<string> => {
        const {command} = parameters;

        const result = await execa(command, {shell: true, reject: false, all: true});
        const {exitCode, all} = result;

        if (!all) {
            return dedent`
                Command executed successfully with no output.
                Exit code: ${exitCode}
            `;
        }

        const lines = all.split('\n').map(v => v.length > MAX_LINE_LENGTH ? v.slice(0, MAX_LINE_LENGTH) + '...' : v);
        const truncatedByLine = lines.join('\n');

        const output = truncatedByLine.length > MAX_OUTPUT
            ? truncatedByLine.slice(0, MAX_OUTPUT) + `\n(Output truncated at ${MAX_OUTPUT} characters.)`
            : truncatedByLine;

        return dedent`
            Command executed successfully.
            Exit code: ${exitCode}
            Output:
            ${output}
        `;
    };
}
