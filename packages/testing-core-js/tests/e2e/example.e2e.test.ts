// node_modules
import { expect } from 'chai'

// src
import { common } from '../../src/index.js'

describe('e2e', () => {
	it('exposes common off the package root', () => {
		expect(common.deepCopy({ a: 1 })).to.deep.equal({ a: 1 })
	})
})
