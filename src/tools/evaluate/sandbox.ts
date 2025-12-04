import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execa} from 'execa';

const SANDBOX_DIRECTORY = path.join(os.homedir(), '.oniichan-agent', 'sandbox');

const DEFAULT_PACKAGE_JSON = {
    name: 'oniichan-agent-sandbox',
    type: 'module',
};

export class SandboxManager {
    private sandboxDirectory: string;

    constructor() {
        this.sandboxDirectory = SANDBOX_DIRECTORY;
    }

    async init(): Promise<void> {
        await fs.mkdir(this.sandboxDirectory, {recursive: true});

        const packageJsonPath = path.join(this.sandboxDirectory, 'package.json');
        if (!existsSync(packageJsonPath)) {
            await fs.writeFile(
                packageJsonPath,
                JSON.stringify(DEFAULT_PACKAGE_JSON, null, 2),
                'utf8'
            );
        }
    }

    async installDependencies(dependencies: string[]): Promise<void> {
        await execa(
            'npm',
            ['install', ...dependencies],
            {cwd: this.sandboxDirectory}
        );
    }

    async writeScript(name: string, code: string): Promise<string> {
        const scriptPath = this.getScriptPath(name);
        await fs.writeFile(scriptPath, code, 'utf8');
        return scriptPath;
    }

    async cleanup(name: string): Promise<void> {
        const scriptPath = this.getScriptPath(name);
        await fs.unlink(scriptPath);
    }

    getScriptPath(name: string): string {
        return path.join(this.sandboxDirectory, `${name}.js`);
    }
}
