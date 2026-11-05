// node_modules
import { describe, expect, it } from 'vitest'

// src
import { deepCopy } from '../../src/common.js'

describe('common', () => {
	describe('deepCopy', () => {
		it('should return a value equal to the source', () => {
			const source = { id: 1, nested: { status: 'pending' }, tags: ['a', 'b'] }

			expect(deepCopy(source)).toEqual(source)
		})

		it('should not share references with the source', () => {
			const source = { nested: { status: 'pending' }, tags: ['a'] }
			const copy = deepCopy(source)

			expect(copy).not.toBe(source)
			expect(copy.nested).not.toBe(source.nested)
			expect(copy.tags).not.toBe(source.tags)
		})

		it('should not leak mutations of the copy back into the source', () => {
			const source = { nested: { status: 'pending' }, tags: ['a'] }
			const copy = deepCopy(source)

			copy.nested.status = 'complete'
			copy.tags.push('b')

			expect(source.nested.status).toBe('pending')
			expect(source.tags).toEqual(['a'])
		})

		it('should copy dates as dates rather than strings', () => {
			const source = { createdAt: new Date('2020-01-01T00:00:00.000Z') }
			const copy = deepCopy(source)

			expect(copy.createdAt).toBeInstanceOf(Date)
			expect(copy.createdAt).not.toBe(source.createdAt)
			expect(copy.createdAt.toISOString()).toBe(source.createdAt.toISOString())
		})

		it('should pass primitives and nullish values through', () => {
			expect(deepCopy(1)).toBe(1)
			expect(deepCopy('a')).toBe('a')
			expect(deepCopy(null)).toBeNull()
			expect(deepCopy(undefined)).toBeUndefined()
		})
	})
})
