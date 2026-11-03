import { expect } from 'chai'

// application/testee
import { omitNil } from '../../src/obj.js'

describe('obj.ts', () => {
	before(async () => {})

	after(async () => {})

	beforeEach(async () => {})

	afterEach(async () => {})

	it('should remove properties that have values of undefined or null fron an object', async () => {
		const returned = omitNil({
			zero: 0,
			one: 'world',
			two: undefined,
			three: null,
			four: NaN,
			five: false,
		})

		expect(returned).to.be.not.undefined
		expect(returned).to.have.property('zero').eq(0)
		expect(returned).to.have.property('one').eq('world')
		expect(returned).to.not.have.property('two')
		expect(returned).to.not.have.property('three')
		expect(returned).to.have.property('four').be.NaN
		expect(returned).to.have.property('five').eq(false)
	})
})
