import type {TimelineEntry} from '../loop/interface.js';

export interface QueryState {
    timeline: readonly TimelineEntry[];
    model: string;
    userQuery: string;
    cwd: string;
}

export interface QueryContextProvider {
    provide(state: QueryState): string | Promise<string>;
}
