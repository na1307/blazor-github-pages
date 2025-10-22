import {defineConfig} from 'vite'
import {resolve} from "node:path";
import {builtinModules} from "node:module";

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            fileName: 'index',
            formats: ['es']
        },
        target: 'es2022',
        sourcemap: true,
        rollupOptions: {
            external: [...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
            output: {
                inlineDynamicImports: true
            },
            preserveSymlinks: true
        }
    }
})
