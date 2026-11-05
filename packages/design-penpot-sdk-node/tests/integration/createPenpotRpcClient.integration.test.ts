// node_modules
import { clearInterceptors, intercept } from '@brrritscold/testing-core-node/nock'
import nock from 'nock'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

// testee
import { createPenpotRpcClient } from '../../src/rpc.js'
// utils
import { accessToken, penpotUrl } from './__utils__/utils.js'

describe('createPenpotRpcClient', () => {
	beforeAll(() => {
		nock.disableNetConnect()
	})

	afterEach(() => {
		clearInterceptors()
	})

	afterAll(() => {
		nock.enableNetConnect()
	})

	it('should answer undefined for a command Penpot answers with no body (delete-file, 204)', async () => {
		intercept([
			{
				method: 'post',
				url: penpotUrl(),
				endpoint: '/api/rpc/command/delete-file',
				reply: { statusCode: 204, body: '' },
			},
		])
		const penpot = createPenpotRpcClient({ baseUrl: penpotUrl(), accessToken: accessToken() })

		await expect(penpot.command('delete-file', { id: 'file-id' })).resolves.toBeUndefined()
	})
})
