import type {ToolImplementation} from '../interface.js';
import type {TaskOutputToolParameters} from './definition.js';

function formatOutput(
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

export async function createTaskOutputImplement(): Promise<ToolImplementation<TaskOutputToolParameters>> {
    return async (parameters, context): Promise<string> => {
        const {task_id: taskId, offset, limit} = parameters;
        const {processes, subagents} = context;

        if (taskId.startsWith('agent_')) {
            const subagent = subagents.get(taskId);
            if (!subagent) {
                const availableIds = [...subagents.keys()].join(', ');
                if (availableIds) {
                    throw new Error(
                        `task_id \`${taskId}\` not found, available task IDs: \`${availableIds}\``
                    );
                }
                throw new Error('no background tasks exist');
            }

            const statusText = subagent.isRunning() ? 'running' : 'completed';
            return formatOutput(subagent.getLastMessageText(), statusText, offset, limit);
        }

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
        return formatOutput(record.output, statusText, offset, limit);
    };
}
