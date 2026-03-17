import os from 'node:os';
import dedent from 'dedent';
import type {QueryContextProvider, QueryState} from './interface.js';

export class WorkspaceEnvProvider implements QueryContextProvider {
    provide(state: QueryState): string {
        const date = new Date();
        const weekday = date.toLocaleDateString('en-US', {weekday: 'long'});
        const month = date.toLocaleDateString('en-US', {month: 'short'});
        const day = date.getDate();
        const year = date.getFullYear();

        return dedent`
            <env>
            Below is a snapshot of the current workspace's file structure at the start of the conversation. This snapshot will NOT update during the conversation.

            OS Version: ${os.platform()} ${os.release()}
            Current Date: ${weekday} ${month} ${day}, ${year}
            Shell: ${process.env.SHELL ?? '/bin/sh'}

            Workspace Path:
            - ${state.cwd}

            Note: Using absolute paths over relative paths as tool call args.
            </env>
        `;
    }
}
