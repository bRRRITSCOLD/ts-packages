import { defineConfig } from 'tsup'

export default defineConfig([
	{
		entryPoints: ['src/code-manifest.ts', 'src/drift-check.ts'],
		format: ['cjs', 'esm'],
		dts: true,
		minify: false,
		outDir: 'dist/',
		clean: true,
		sourcemap: false,
		bundle: true,
		// Shared modules become chunks, so the two entries never carry two copies of one module.
		splitting: true,
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
		skipNodeModulesBundle: false,
	},
])
