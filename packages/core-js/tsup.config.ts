import { defineConfig } from 'tsup'

export default defineConfig([
	{
		entryPoints: [
			'src/index.ts',
			'src/date.ts',
			'src/error.ts',
			'src/obj.ts',
			'src/query.ts',
			'src/zod.ts',
		],
		format: ['cjs', 'esm'],
		dts: true,
		minify: false,
		outDir: 'dist/',
		clean: true,
		sourcemap: false,
		bundle: true,
		splitting: false,
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
