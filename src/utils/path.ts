import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function scriptDirectory(importMetaUrl: string): string {
    return path.dirname(fileURLToPath(importMetaUrl));
}

export function fromScriptDirectory(importMetaUrl: string, ...segments: string[]): string {
    return path.join(scriptDirectory(importMetaUrl), ...segments);
}
