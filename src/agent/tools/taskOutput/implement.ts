import dedent from 'dedent';
import type {ToolImplementation} from '../interface.js';
import type {TaskOutputToolParameters} from './definition.js';

export async function createTaskOutputImplement(): Promise<ToolImplementation<TaskOutputToolParameters>> {
    return async (parameters, context): Promise<string> => {
        const {task_id: taskId, offset, limit} = parameters;
        const {processes} = context;

        const record = processes.get(taskId);
        if (!record) {
            const availableIds = [...processes.keys()].join(', ');
            if (availableIds) {
                throw new Error(
                    `task_id \`${taskId}\` not found, available task IDs: \`${availableIds}\``
                );
            }
            throw new Error('no background tasks exist');
        }

        const statusText = record.status === 'completed'
            ? `completed, exit code: ${record.exitCode ?? 'unknown'}`
            : 'running';

        if (!record.output) {
            return dedent`
                Status: ${statusText}
                Output: (no output yet)
            `;
        }

        const lines = record.output.replaceAll(/^\n+|\n+$/g, '').split('\n');
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

        const output = [
            `Status: ${statusText}`,
            `Output (lines ${startIndex + 1}-${endIndex} of ${totalLines}):`,
            ...formattedLines,
        ];
        return output.join('\n');
    };
}
