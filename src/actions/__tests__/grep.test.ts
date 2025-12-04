import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {grep} from '../grep.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

describe('grep', () => {
    it('should find import statements in rsbuild.config.txt', async () => {
        const results = await grep({
            cwd: fixturesDir,
            glob: 'rsbuild.config.txt',
            regex: '^import',
        });

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].uri).toContain('rsbuild.config.txt');
        expect(results[0].content).toContain('import');
    });

    it('should find type definitions with context', async () => {
        const results = await grep({
            cwd: fixturesDir,
            glob: 'rsbuild.config.txt',
            regex: 'RsbuildConfig',
        });

        expect(results.length).toBe(1);
        expect(results[0].content).toContain('RsbuildConfig');
        expect(results[0].lineStart).toBeGreaterThan(0);
        expect(results[0].lineEnd).toBeGreaterThanOrEqual(results[0].lineStart);
    });

    it('should find interface definitions in llm.txt', async () => {
        const results = await grep({
            cwd: fixturesDir,
            glob: 'llm.txt',
            regex: '^interface',
        });

        expect(results.length).toBeGreaterThan(0);
        for (const result of results) {
            expect(result.uri).toContain('llm.txt');
            expect(result.content).toContain('interface');
        }
    });

    it('should find function with export keyword', async () => {
        const results = await grep({
            cwd: fixturesDir,
            glob: 'llm.txt',
            regex: 'export.*llmApi',
        });

        expect(results.length).toBe(1);
        expect(results[0].content).toContain('llmApi');
        expect(results[0].content).toContain('export');
    });

    it('should search across multiple files with glob pattern', async () => {
        const results = await grep({
            cwd: fixturesDir,
            glob: '*.txt',
            regex: 'import',
        });

        expect(results.length).toBeGreaterThan(0);
        const files = new Set(results.map(r => path.basename(r.uri)));
        expect(files.size).toBeGreaterThan(1);
    });

    it('should find ValidationError usage', async () => {
        const results = await grep({
            cwd: fixturesDir,
            glob: 'llm.txt',
            regex: 'ValidationError',
        });

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].content).toContain('ValidationError');
    });

    it('should include context lines around matches', async () => {
        const results = await grep({
            cwd: fixturesDir,
            glob: 'rsbuild.config.txt',
            regex: 'pluginReact',
        });

        expect(results.length).toBe(1);
        const lines = results[0].content.split('\n');
        expect(lines.length).toBeGreaterThanOrEqual(3);
    });

    it('should return empty array when no matches found', async () => {
        const results = await grep({
            cwd: fixturesDir,
            glob: '*.txt',
            regex: 'ThisPatternDoesNotExistAnywhere12345',
        });

        expect(results).toEqual([]);
    });

    it('should handle regex with special characters', async () => {
        const results = await grep({
            cwd: fixturesDir,
            glob: 'llm.txt',
            regex: 'async.*Promise<string>',
        });

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].content).toContain('async');
        expect(results[0].content).toContain('Promise<string>');
    });

    it('should search without glob to search all files', async () => {
        const results = await grep({
            cwd: fixturesDir,
            regex: 'const.*=',
        });

        expect(results.length).toBeGreaterThan(0);
    });
});
