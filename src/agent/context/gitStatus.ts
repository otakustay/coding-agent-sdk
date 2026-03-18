import childProcess from 'node:child_process';
import util from 'node:util';
import dedent from 'dedent';
import type {QueryContextProvider, QueryState} from './interface.js';

const execAsync = util.promisify(childProcess.exec);

async function resolveMainBranch(options: {cwd: string}): Promise<string> {
    try {
        const {stdout} = await execAsync('git symbolic-ref refs/remotes/origin/HEAD --short', options);
        return stdout.trim().replace('origin/', '');
    }
    catch {
        // origin HEAD not configured, skip
        return '';
    }
}

export class GitStatusProvider implements QueryContextProvider {
    async provide(state: QueryState): Promise<string> {
        const options = {cwd: state.cwd};
        try {
            const {stdout: branchOutput} = await execAsync('git rev-parse --abbrev-ref HEAD', options);
            const branch = branchOutput.trim();

            const mainBranch = await resolveMainBranch(options);

            const {stdout: statusOutput} = await execAsync('git status --short', options);
            const status = statusOutput.trim();

            const {stdout: commitsOutput} = await execAsync('git log --oneline -5', options);
            const commits = commitsOutput.trim();

            const lines: string[] = [
                'gitStatus: This is the git status at the start of the conversation. Note that this status is a snapshot in time, and will not update during the conversation.',
                `Current branch: ${branch}`,
            ];

            if (mainBranch) {
                lines.push('', `Main branch (you will usually use this for PRs): ${mainBranch}`);
            }

            if (status) {
                lines.push('', 'Status:', status);
            }

            if (commits) {
                lines.push('', 'Recent commits:', commits);
            }

            return dedent`
                <git-status>
                ${lines.join('\n')}
                </git-status>
            `;
        }
        catch {
            return dedent`
                <git-status>
                Not a git repo
                </git-status>
            `;
        }
    }
}
