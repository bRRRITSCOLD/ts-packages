import { expect } from 'chai'

// application/testee
import { getTime } from '../../src/date.js'

describe('date.ts', () => {
	before(async () => {})

	after(async () => {})

	beforeEach(async () => {})

	afterEach(async () => {})

	it('should get the current epoch time', async () => {
		const time = getTime()

		expect(time).to.be.not.undefined
		expect(typeof time === 'number').to.be.true
		expect(time).to.be.lte(new Date().getTime())
		expect(time).to.be.gt(new Date('01/01/2025').getTime())
	})
})
