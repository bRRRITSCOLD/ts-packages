import { defineConfig } from 'tsup'

export default defineConfig([
	{
		entryPoints: ['src/common.ts'],
		format: ['cjs', 'esm'],
		dts: true,
		minify: false,
		outDir: 'dist/',
		clean: true,
		sourcemap: false,
		bundle: true,
		// Shared modules become chunks, so a class (HttpException) has one identity
		// across subpath entries and instanceof keeps working.
		splitting: true,
		outExtension(ctx) {
			return {
				dts: '.d.ts',
				js: ctx.format === 'cjs' ? '.cjs' : '.mjs',
			}
		},
		treeshake: false,
		target: 'es2022',
		platform: 'neutral',
		tsconfig: './tsconfig.build.json',
		cjsInterop: true,
		keepNames: true,
		skipNodeModulesBundle: false,
	},
])
