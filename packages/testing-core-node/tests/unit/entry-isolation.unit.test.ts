import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { expect } from 'chai'

// Importing nock patches node's http module for the whole process. That patch
// breaks testcontainers' hijacked `docker exec` readiness checks (`write EPIPE`),
// so only the `./nock` entry may load it. Each entry is imported in a fresh
// process because the patch cannot be undone once applied.
const isHttpPatchedAfterImporting = (entry: string): boolean => {
	const entryUrl = new URL(`../../src/${entry}`, import.meta.url).href
	const probe = `
		const { createRequire } = await import('node:module')
		const http = createRequire(import.meta.url)('node:http')
		const before = [http.request, http.get, http.ClientRequest]
		await import(${JSON.stringify(entryUrl)})
		const after = [http.request, http.get, http.ClientRequest]
		process.stdout.write(String(before.some((fn, i) => fn !== after[i])))
	`
	const output = execFileSync(
		process.execPath,
		['--import', 'tsx', '--input-type=module', '-e', probe],
		{ cwd: fileURLToPath(new URL('../..', import.meta.url)), encoding: 'utf8' }
	)

	return output.trim() === 'true'
}

describe('entry isolation', () => {
	it('should not patch http when importing the docker entry', () => {
		expect(isHttpPatchedAfterImporting('docker.ts')).to.equal(false)
	})

	it('should patch http when importing the nock entry (probe sanity check)', () => {
		expect(isHttpPatchedAfterImporting('nock.ts')).to.equal(true)
	})
})
