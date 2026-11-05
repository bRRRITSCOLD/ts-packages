import { defineConfig } from 'tsup'

export default defineConfig([
	{
		entryPoints: [
			'src/code-manifest.ts',
			'src/component-link.ts',
			'src/drift-check.ts',
			'src/library-snapshot.ts',
			'src/token-file.ts',
			'src/token-sync.ts',
		],
		format: ['cjs', 'esm'],
		dts: true,
		minify: false,
		outDir: 'dist/',
		clean: true,
		sourcemap: false,
		bundle: true,
		// Shared modules become chunks, so each schema has one identity across subpath entries.
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
