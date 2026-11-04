import { defineConfig } from 'tsup'

export default defineConfig([
	{
		entryPoints: [
			'src/dotenv.ts',
			'src/jwt.ts',
			'src/mongodb.ts',
			'src/postgres.ts',
			'src/query.ts',
			'src/query/mongodb.ts',
			'src/s3.ts',
			'src/secrets-manager.ts',
		],
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
		platform: 'node',
		tsconfig: './tsconfig.build.json',
		cjsInterop: true,
		keepNames: true,
		skipNodeModulesBundle: true,
		external: [
			// knex optional dialects — only pg is installed
			'mysql',
			'mysql2',
			'tedious',
			'oracledb',
			'sqlite3',
			'better-sqlite3',
			'mariadb',
			'mariadb/callback',
			'pg-native',
		],
	},
])
