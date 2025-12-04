import module from 'node:module';
import type {ResolveHookSync} from 'node:module';
import url from 'node:url';
import path from 'node:path';

const resolve: ResolveHookSync = (specifier, context, nextResolve) => {
    if (specifier === 'agent-tools') {
        const currentFile = url.fileURLToPath(import.meta.url);
        const actionsPath = path.resolve(path.dirname(currentFile), '../../actions/index.js');
        return nextResolve(actionsPath, context);
    }
    return nextResolve(specifier, context);
};

const hooks = {
    resolve,
};

module.registerHooks(hooks);
