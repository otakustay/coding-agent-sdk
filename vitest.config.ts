import type {ViteUserConfig} from 'vitest/config';

export default {
    test: {
        include: ['src/**/__tests__/**/*.test.ts'],
    },
} satisfies ViteUserConfig;
