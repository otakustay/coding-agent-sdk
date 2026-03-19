import dedent from 'dedent';
import type {FinishReason} from '../interface.js';

export function formatBashBackgroundNotification(taskId: string, finishReason: Exclude<FinishReason, 'stop'>): string {
    if (finishReason === 'success') {
        return dedent`
            Background task \`${taskId}\` has completed successfully.
            Use the \`taskOutput\` tool with task ID \`${taskId}\` to read the output.
        `;
    }
    return dedent`
        Background task \`${taskId}\` has terminated unexpectedly.
        Use the \`taskOutput\` tool with task ID \`${taskId}\` to read the output and check what went wrong.
    `;
}
