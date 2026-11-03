import { expect } from 'chai'
import _nock from 'nock'
// application/testee
import { nock } from '../../src/index.js'
// types
import { GenericRecord } from '../__utils__/types.js'

// fixtures
const product = { name: 'Super Epic Sword', damage: 10 }
const productPatch = { name: product.name, damage: 15 }
const productPut = { name: 'Super Epic Spear', damage: 20 }

describe('nock.ts', () => {
	before(async () => {})

	after(async () => {})

	beforeEach(async () => {
		_nock.cleanAll()
	})

	afterEach(async () => {
		_nock.cleanAll()
	})

	context('intercept', () => {
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

			expect(response).to.be.not.undefined

			expect(response.status).to.be.not.undefined
			expect(response.status).to.eq(200)

			response = await fetch('https://dummyjson.com/products', {
				method: 'OPTIONS',
			})

			expect(response).to.be.not.undefined

			expect(response.status).to.be.not.undefined
			expect(response.status).to.eq(200)

			response = await fetch('https://dummyjson.com/products', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: product.name, damage: product.damage }),
			})

			expect(response).to.be.not.undefined

			expect(response.status).to.be.not.undefined
			expect(response.status).to.eq(200)

			const postJson = (await response.json()) as GenericRecord

			expect(postJson).to.be.not.undefined
			expect(
				postJson.id === 1 &&
					postJson.name === product.name &&
					postJson.damage === product.damage
			).to.be.true

			response = await fetch('https://dummyjson.com/products/1', {
				method: 'GET',
			})

			expect(response).to.be.not.undefined

			expect(response.status).to.be.not.undefined
			expect(response.status).to.eq(200)

			const getJson = (await response.json()) as GenericRecord

			expect(getJson).to.be.not.undefined
			expect(
				getJson.id === 1 &&
					getJson.name === product.name &&
					getJson.damage === product.damage
			).to.be.true

			response = await fetch('https://dummyjson.com/products/1', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: productPatch.name, damage: productPatch.damage }),
			})

			expect(response).to.be.not.undefined

			expect(response.status).to.be.not.undefined
			expect(response.status).to.eq(200)

			const patchJson = (await response.json()) as GenericRecord

			expect(patchJson).to.be.not.undefined
			expect(
				patchJson.id === 1 &&
					patchJson.name === productPatch.name &&
					patchJson.damage === productPatch.damage
			).to.be.true

			response = await fetch('https://dummyjson.com/products/1', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: productPut.name, damage: productPut.damage }),
			})

			expect(response).to.be.not.undefined

			expect(response.status).to.be.not.undefined
			expect(response.status).to.eq(200)

			const putJson = (await response.json()) as GenericRecord

			expect(putJson).to.be.not.undefined
			expect(
				putJson.id === 1 &&
					putJson.name === productPut.name &&
					putJson.damage === productPut.damage
			).to.be.true

			response = await fetch('https://dummyjson.com/products/1', {
				method: 'DELETE',
			})

			expect(response).to.be.not.undefined

			expect(response.status).to.be.not.undefined
			expect(response.status).to.eq(200)

			const deleteJson = (await response.json()) as GenericRecord

			expect(deleteJson).to.be.not.undefined
			expect(
				deleteJson.id === 1 &&
					deleteJson.name === productPut.name &&
					deleteJson.damage === productPut.damage
			).to.be.true

			const filtered = interceptScopes.filter((scope) => scope.isDone() !== true)

			expect(filtered.length).to.eq(0)
		})
	})

	context('clearInterceptors', () => {
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

			expect(filtered.length).to.eq(1)

			expect(_nock.activeMocks()).to.have.lengthOf(1)

			nock.clearInterceptors()

			expect(_nock.activeMocks()).to.have.lengthOf(0)

			filtered = interceptScopes.filter((scope) => scope.isDone() !== true)

			expect(filtered.length).to.eq(0)
		})
	})
})
