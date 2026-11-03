import { defineConfig } from 'tsup'

export default defineConfig([
	{
		entryPoints: ['src/index.ts'],
		format: ['cjs', 'esm'],
		dts: true,
		minify: false,
		outDir: 'dist/',
		clean: true,
		sourcemap: false,
		bundle: true,
		// The banner fix addresses the "Dynamic require" error in ESM output
		banner: ({ format }) => {
			if (format === 'esm') {
				return {
					js: `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
                        `,
				}
			}
		},
		// Keep these as safeguards
		shims: true,
		outExtension(ctx) {
			return {
				dts: '.d.ts',
				js: ctx.format === 'cjs' ? '.cjs' : '.mjs',
			}
		},
		treeshake: false,
		target: 'es2022',
		platform: 'node',
		tsconfig: './tsconfig.build.json',
		cjsInterop: true,
		keepNames: true,
		external: ['process'],
		skipNodeModulesBundle: false,
	},
])
