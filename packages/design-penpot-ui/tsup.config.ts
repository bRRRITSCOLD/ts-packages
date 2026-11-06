import { defineConfig, type Options } from 'tsup'

// Three browser bundles, no library output: this package exports nothing. Each is one IIFE
// with design-core-js (and zod) bundled in, because Penpot and MCP `execute_code` load a single
// script, not modules.
const bundle: Options = {
	format: ['iife'],
	platform: 'browser',
	target: 'es2022',
	dts: false,
	minify: false,
	sourcemap: false,
	splitting: false,
	noExternal: [/.*/],
	tsconfig: './tsconfig.build.json',
	outExtension: () => ({ js: '.js' }),
}

export default defineConfig([
	{
		...bundle,
		// The link inspector: dist/link-inspector/{manifest.json,ui.html,plugin.js,ui.js}.
		entry: { plugin: 'src/entries/plugin.ts', ui: 'src/entries/ui.ts' },
		outDir: 'dist/link-inspector',
		publicDir: 'public',
		clean: true,
	},
	{
		...bundle,
		// The link reader: dist/read-links.js, the body of one MCP `execute_code` call.
		entry: { 'read-links': 'src/entries/read-links.ts' },
		// Minified: an agent sends the whole file as the code of an MCP call.
		minify: true,
		outDir: 'dist',
		clean: false,
		globalName: '__designPenpotUiReadLinks',
		footer: { js: 'return __designPenpotUiReadLinks.readLinks(penpot);' },
	},
])
