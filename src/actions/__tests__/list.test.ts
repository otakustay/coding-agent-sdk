import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {list} from '../list.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(__dirname, 'fixtures/test-project');

describe('list', () => {
    it('should list root at depth 0', async () => {
        const result = await list({
            uri: fixtureRoot,
            depth: 0,
        });

        expect(result).toContain('.gitignore');
        expect(result).toContain('a.txt');
        expect(result).toContain('b/');
        expect(result).toContain('h/');
        expect(result).not.toContain('  c.txt');
    });

    it('should list root at depth 1', async () => {
        const result = await list({
            uri: fixtureRoot,
            depth: 1,
        });

        expect(result).toContain('b/');
        expect(result).toContain('  .dotfile');
        expect(result).toContain('  c.txt');
        expect(result).toContain('  d/');
        expect(result).not.toContain('    e.txt');
    });

    it('should list root at depth 2', async () => {
        const result = await list({
            uri: fixtureRoot,
            depth: 2,
        });

        expect(result).toContain('b/');
        expect(result).toContain('  d/');
        expect(result).toContain('    .hidden');
        expect(result).toContain('    e.txt');
        expect(result).toContain('    f/');
        expect(result).not.toContain('      g.txt');
    });

    it('should list root at depth 3', async () => {
        const result = await list({
            uri: fixtureRoot,
            depth: 3,
        });

        expect(result).toContain('b/');
        expect(result).toContain('  d/');
        expect(result).toContain('    f/');
        expect(result).toContain('      .config');
        expect(result).toContain('      g.txt');
    });

    it('should include dot files at all levels', async () => {
        const result = await list({
            uri: fixtureRoot,
            depth: 3,
        });

        expect(result).toContain('.gitignore');
        expect(result).toContain('  .dotfile');
        expect(result).toContain('    .hidden');
        expect(result).toContain('      .config');
    });

    it('should distinguish directories from files', async () => {
        const result = await list({
            uri: fixtureRoot,
            depth: 1,
        });

        expect(result).toContain('b/');
        expect(result).toContain('  c.txt');
        expect(result).not.toContain('c.txt/');
    });

    it('should use default depth of 1 when not specified', async () => {
        const result = await list({
            uri: fixtureRoot,
        });

        expect(result).toContain('b/');
        expect(result).toContain('  c.txt');
        expect(result).not.toContain('    e.txt');
    });

    it('should handle deep nested structure at depth 4', async () => {
        const result = await list({
            uri: fixtureRoot,
            depth: 4,
        });

        expect(result).toContain('h/');
        expect(result).toContain('  i/');
        expect(result).toContain('    j/');
        expect(result).toContain('      k.txt');
    });

    it('should format output with proper indentation', async () => {
        const result = await list({
            uri: fixtureRoot,
            depth: 2,
        });

        const lines = result.split('\n');
        const rootLevel = lines.filter(line => !line.startsWith(' '));
        const firstLevel = lines.filter(line => line.startsWith('  ') && !line.startsWith('    '));
        const secondLevel = lines.filter(line => line.startsWith('    ') && !line.startsWith('      '));

        expect(rootLevel.length).toBeGreaterThan(0);
        expect(firstLevel.length).toBeGreaterThan(0);
        expect(secondLevel.length).toBeGreaterThan(0);
    });

    it('should sort entries alphabetically', async () => {
        const result = await list({
            uri: fixtureRoot,
            depth: 1,
        });

        const lines = result.split('\n');
        const rootEntries = lines.filter(line => !line.startsWith(' '));

        expect(rootEntries.indexOf('.gitignore')).toBeLessThan(rootEntries.indexOf('a.txt'));
        expect(rootEntries.indexOf('a.txt')).toBeLessThan(rootEntries.indexOf('b/'));
    });
});
