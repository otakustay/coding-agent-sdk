import path from 'node:path';
import type {GrepToolParameters} from './definition.js';
import type {ToolImplementation} from '../interface.js';
import {runRgCommand} from './command.js';

const MAX_MATCHES = 100;

export async function createGrepImplement(): Promise<ToolImplementation<GrepToolParameters>> {
    return async (parameters): Promise<string> => {
        const {
            pattern,
            path: searchPath,
            glob,
            output_mode: outputMode = 'files_with_matches',
            '-B': contextBefore,
            '-A': contextAfter,
            '-C': contextAround,
            '-n': showLineNumbers = true,
            '-i': caseInsensitive,
            type: fileType,
            head_limit: headLimit,
            offset = 0,
            multiline,
        } = parameters;

        const args: string[] = [];

        if (caseInsensitive) {
            args.push('-i');
        }
        if (multiline) {
            args.push('-U', '--multiline-dotall');
        }
        if (fileType) {
            args.push('--type', fileType);
        }
        if (glob) {
            args.push('--glob', glob);
        }

        if (outputMode === 'files_with_matches') {
            args.push('--files-with-matches');
        }
        else if (outputMode === 'count') {
            args.push('--count');
        }
        else {
            args.push('--json');

            if (typeof contextAround === 'number') {
                args.push('-C', contextAround.toString());
            }
            else {
                if (typeof contextBefore === 'number') {
                    args.push('-B', contextBefore.toString());
                }
                if (typeof contextAfter === 'number') {
                    args.push('-A', contextAfter.toString());
                }
            }
        }

        if (outputMode !== 'content') {
            args.push('--max-count', MAX_MATCHES.toString());
        }

        args.push('--', pattern, path.resolve(searchPath ?? '.'));

        return runRgCommand({args, outputMode, headLimit, offset, showLineNumbers});
    };
}
