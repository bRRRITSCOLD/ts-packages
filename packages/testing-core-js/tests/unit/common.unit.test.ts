// node_modules
import { expect } from 'chai'

// src
import { deepCopy } from '../../src/common.js'

describe('common', () => {
	describe('deepCopy', () => {
		it('returns a value equal to the source', () => {
			const source = { id: 1, nested: { status: 'pending' }, tags: ['a', 'b'] }

			expect(deepCopy(source)).to.deep.equal(source)
		})

		it('does not share references with the source', () => {
			const source = { nested: { status: 'pending' }, tags: ['a'] }
			const copy = deepCopy(source)

			expect(copy).to.not.equal(source)
			expect(copy.nested).to.not.equal(source.nested)
			expect(copy.tags).to.not.equal(source.tags)
		})

		it('does not leak mutations of the copy back into the source', () => {
			const source = { nested: { status: 'pending' }, tags: ['a'] }
			const copy = deepCopy(source)

			copy.nested.status = 'complete'
			copy.tags.push('b')

			expect(source.nested.status).to.equal('pending')
			expect(source.tags).to.deep.equal(['a'])
		})

		it('copies dates as dates rather than strings', () => {
			const source = { createdAt: new Date('2020-01-01T00:00:00.000Z') }
			const copy = deepCopy(source)

			expect(copy.createdAt).to.be.instanceOf(Date)
			expect(copy.createdAt).to.not.equal(source.createdAt)
			expect(copy.createdAt.toISOString()).to.equal(source.createdAt.toISOString())
		})

		it('passes primitives and nullish values through', () => {
			expect(deepCopy(1)).to.equal(1)
			expect(deepCopy('a')).to.equal('a')
			expect(deepCopy(null)).to.equal(null)
			expect(deepCopy(undefined)).to.equal(undefined)
		})
	})
})
