import { describe, expect, it } from 'vitest'

// application/testee
import { load } from '../../src/dotenv.js'

describe('dotenv.ts', () => {
	describe('load', () => {
		it('should verify missing env vars and then load env vars + verify no missing vars', async () => {
			let response = load({
				example: '.env.example',
				path: '.env.unit.test',
				quiet: true,
			})

			expect(response).toBeDefined()
			expect(response.data).toBeUndefined()
			expect(response.error).toBeDefined()
			expect([undefined, 'NA']).toContain(process.env.SUPER_SECRET)

			response = load({
				example: '.env.example',
				path: '.env.integration.test',
				override: true,
				quiet: true,
			})

			expect(response).toBeDefined()
			expect(response.error).toBeUndefined()
			expect(response.data).toBeDefined()
			expect(process.env.SUPER_SECRET).toBe('NUN_YA!')
		})
	})
})
