import dedent from 'dedent';
import type {QueryContextProvider, QueryState} from './interface.js';

export class UserQueryProvider implements QueryContextProvider {
    provide(state: QueryState): string {
        return dedent`
            <user-query>
            Based on all available information and context, respond to the user's query using the same language as the query:
            ${state.userQuery}
            </user-query>
        `;
    }
}
