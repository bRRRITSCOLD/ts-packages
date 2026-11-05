import _nock from 'nock'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// application/testee
import * as nock from '../../src/nock.js'
// types
import { GenericRecord } from '../__utils__/types.js'

// fixtures
const product = { name: 'Super Epic Sword', damage: 10 }
const productPatch = { name: product.name, damage: 15 }
const productPut = { name: 'Super Epic Spear', damage: 20 }

describe('nock.ts', () => {
	beforeEach(async () => {
		_nock.cleanAll()
	})

	afterEach(async () => {
		_nock.cleanAll()
	})

	describe('intercept', () => {
		it('should intercept 1...N http calls', async () => {
			const interceptScopes = nock.intercept([
				{
					method: 'head',
					url: 'https://dummyjson.com',
					endpoint: '/products',
					reply: {
						statusCode: 200,
					},
				},
				{
					method: 'options',
					url: 'https://dummyjson.com',
					endpoint: '/products',
					reply: {
						statusCode: 200,
					},
				},
				{
					method: 'post',
					url: 'https://dummyjson.com',
					endpoint: '/products',
					body: (body: GenericRecord) => {
						return body.name === product.name && body.damage === product.damage
					},
					reply: {
						statusCode: 200,
						body: { id: 1, name: product.name, damage: product.damage },
					},
				},
				{
					method: 'get',
					url: 'https://dummyjson.com',
					endpoint: '/products/1',
					reply: {
						statusCode: 200,
						body: { id: 1, name: product.name, damage: product.damage },
					},
				},
				{
					method: 'patch',
					url: 'https://dummyjson.com',
					endpoint: '/products/1',
					body: (body: GenericRecord) => {
						return (
							body.damage === productPatch.damage && body.name === productPatch.name
						)
					},
					reply: {
						statusCode: 200,
						body: { id: 1, name: productPatch.name, damage: productPatch.damage },
					},
				},
				{
					method: 'put',
					url: 'https://dummyjson.com',
					endpoint: '/products/1',
					body: (body: GenericRecord) => {
						return body.name === productPut.name && body.damage === productPut.damage
					},
					reply: {
						statusCode: 200,
						body: { id: 1, name: productPut.name, damage: productPut.damage },
					},
				},
				{
					method: 'delete',
					url: 'https://dummyjson.com',
					endpoint: '/products/1',
					reply: {
						statusCode: 200,
						body: { id: 1, name: productPut.name, damage: productPut.damage },
					},
				},
			])

			let response: Response

			response = await fetch('https://dummyjson.com/products', {
				method: 'HEAD',
			})

			expect(response.status).toBe(200)

			response = await fetch('https://dummyjson.com/products', {
				method: 'OPTIONS',
			})

			expect(response.status).toBe(200)

			response = await fetch('https://dummyjson.com/products', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: product.name, damage: product.damage }),
			})

			expect(response.status).toBe(200)

			const postJson = (await response.json()) as GenericRecord

			expect(postJson).toEqual({ id: 1, ...product })

			response = await fetch('https://dummyjson.com/products/1', {
				method: 'GET',
			})

			expect(response.status).toBe(200)

			const getJson = (await response.json()) as GenericRecord

			expect(getJson).toEqual({ id: 1, ...product })

			response = await fetch('https://dummyjson.com/products/1', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: productPatch.name, damage: productPatch.damage }),
			})

			expect(response.status).toBe(200)

			const patchJson = (await response.json()) as GenericRecord

			expect(patchJson).toEqual({ id: 1, ...productPatch })

			response = await fetch('https://dummyjson.com/products/1', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: productPut.name, damage: productPut.damage }),
			})

			expect(response.status).toBe(200)

			const putJson = (await response.json()) as GenericRecord

			expect(putJson).toEqual({ id: 1, ...productPut })

			response = await fetch('https://dummyjson.com/products/1', {
				method: 'DELETE',
			})

			expect(response.status).toBe(200)

			const deleteJson = (await response.json()) as GenericRecord

			expect(deleteJson).toEqual({ id: 1, ...productPut })

			const filtered = interceptScopes.filter((scope) => scope.isDone() !== true)

			expect(filtered).toHaveLength(0)
		})
	})

	describe('clearInterceptors', () => {
		it('should clear (deactivate) all http interceptors', async () => {
			const interceptScopes = nock.intercept([
				{
					method: 'head',
					url: 'https://dummyjson.com',
					endpoint: '/products',
					reply: {
						statusCode: 200,
					},
				},
			])

			let filtered = interceptScopes.filter((scope) => scope.isDone() !== true)

			expect(filtered).toHaveLength(1)

			expect(_nock.activeMocks()).toHaveLength(1)

			nock.clearInterceptors()

			expect(_nock.activeMocks()).toHaveLength(0)

			filtered = interceptScopes.filter((scope) => scope.isDone() !== true)

			expect(filtered).toHaveLength(0)
		})
	})
})
