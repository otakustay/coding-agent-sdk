import {describe, it, expect} from 'vitest';
import type {TaskRecord} from '../../interface.js';
import {sortByBlocker} from '../sort.js';

function task(id: string, blockedBy: string[] = []): TaskRecord {
    return {id, subject: id, description: '', status: 'pending', blocks: [], blockedBy, metadata: {}};
}

describe('sortByBlocker', () => {
    it('returns empty array for empty input', () => {
        expect(sortByBlocker([])).toEqual([]);
    });

    it('single task with no blockers', () => {
        const tasks = [task('A')];
        expect(sortByBlocker(tasks).map(t => t.id)).toEqual(['A']);
    });

    it('linear chain: A blocked by B, B blocked by C — C comes first', () => {
        const tasks = [task('A', ['B']), task('B', ['C']), task('C')];
        expect(sortByBlocker(tasks).map(t => t.id)).toEqual(['C', 'B', 'A']);
    });

    it('diamond: C blocked by both A and B — C comes last', () => {
        const tasks = [task('C', ['A', 'B']), task('A'), task('B')];
        expect(sortByBlocker(tasks).map(t => t.id)).toEqual(['A', 'B', 'C']);
    });

    it('multiple disconnected tasks retain input order', () => {
        const tasks = [task('X'), task('Y'), task('Z')];
        expect(sortByBlocker(tasks).map(t => t.id)).toEqual(['X', 'Y', 'Z']);
    });

    it('external blocker (not in the list) is ignored — task treated as unblocked', () => {
        const tasks = [task('A', ['GHOST']), task('B')];
        expect(sortByBlocker(tasks).map(t => t.id)).toEqual(['A', 'B']);
    });

    it('multi-level chain: D blocked by C, C blocked by A and B', () => {
        const tasks = [task('D', ['C']), task('C', ['A', 'B']), task('A'), task('B')];
        expect(sortByBlocker(tasks).map(t => t.id)).toEqual(['A', 'B', 'C', 'D']);
    });

    it('cyclic dependency: all tasks still returned', () => {
        const tasks = [task('A', ['B']), task('B', ['A'])];
        const result = sortByBlocker(tasks);
        expect(result).toHaveLength(2);
        expect(result.map(t => t.id).toSorted()).toEqual(['A', 'B']);
    });

    it('partial cycle mixed with normal tasks: unblocked task comes first', () => {
        const tasks = [task('A', ['B']), task('B', ['A']), task('C')];
        expect(sortByBlocker(tasks).map(t => t.id)).toEqual(['C', 'A', 'B']);
    });

    it('preserves object identity (no copying)', () => {
        const tasks = [task('A'), task('B', ['A'])];
        const result = sortByBlocker(tasks);
        expect(result[0]).toBe(tasks[0]);
        expect(result[1]).toBe(tasks[1]);
    });
});
