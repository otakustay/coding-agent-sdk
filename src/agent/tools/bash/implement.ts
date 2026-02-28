import {execa} from 'execa';
import dedent from 'dedent';
import {truncateText} from '../../../utils/string.js';
import type {ToolImplementation} from '../interface.js';
import type {BashToolParameters} from './definition.js';

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

        const output = truncateText(
            all,
            {
                maxCharactersPerLine: MAX_LINE_LENGTH,
                maxTotalCharacters: MAX_OUTPUT,
                onTruncate: truncated => truncated + `\n(Output truncated at ${truncated.length} characters.)`,
            }
        );

        return dedent`
            Command executed successfully.
            Exit code: ${exitCode}
            Output:
            ${output}
        `;
    };
}
