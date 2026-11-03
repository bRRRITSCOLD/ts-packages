import { expect } from 'chai'

// application/testee
import { load } from '../../src/dotenv.js'

describe('dotenv.ts', () => {
	before(async () => {})

	after(async () => {})

	beforeEach(async () => {})

	afterEach(async () => {})

	context('load', () => {
		it('should verify missing env vars and then load env vars + verify no missing vars', async () => {
			let response = load({
				example: '.env.example',
				path: '.env.unit.test',
				quiet: true,
			})

			expect(response).to.be.not.undefined
			expect(response.data).to.be.undefined
			expect(response.error).to.be.not.undefined
			expect(process.env.SUPER_SECRET === undefined || process.env.SUPER_SECRET === 'NA').to
				.be.true

			response = load({
				example: '.env.example',
				path: '.env.integration.test',
				override: true,
				quiet: true,
			})

			expect(response).to.be.not.undefined
			expect(response.error).to.be.undefined
			expect(response.data).to.be.not.undefined
			expect(process.env.SUPER_SECRET !== undefined || process.env.SUPER_SECRET !== '').to.be
				.true
			expect(process.env.SUPER_SECRET).to.eq('NUN_YA!')
		})
	})
})
