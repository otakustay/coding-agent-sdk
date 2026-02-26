import {z} from 'zod';

const readToolInputSchema = z.object({
    file: z.string().describe('The absolute path of the file to read'),
});

export type ReadToolParameters = z.infer<typeof readToolInputSchema>;

export async function defineReadTool() {
    return {
        name: 'read' as const,
        description: 'Read the contents of a file from the filesystem',
        inputSchema: readToolInputSchema,
    };
}