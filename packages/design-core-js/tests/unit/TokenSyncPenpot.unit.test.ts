import type { Penpot, Shape } from '@penpot/plugin-types'
import { describe, expectTypeOf, it } from 'vitest'
// testee
import type { PenpotShape, TokenSyncPenpot } from '../../src/token-sync.js'

// The contract between the token sync's fakes and Penpot's plugin API, checked by `typecheck`
// against the plugin typings pinned to Penpot 2.18.6 (`@penpot/plugin-types` 1.5.0). Penpot can't
// run in hosted CI, so the live objects are checked by hand; the slice's older members predate
// this test and are not covered yet.
describe('TokenSyncPenpot', () => {
	it("should read the open file's library id as the plugin API declares it", () => {
		expectTypeOf<Penpot['library']['local']['id']>().toEqualTypeOf<
			TokenSyncPenpot['library']['local']['id']
		>()
	})

	it("should read the library of a copy's main as the plugin API declares it", () => {
		expectTypeOf<Shape['componentHead']>().toExtend<NonNullable<PenpotShape['componentHead']>>()
		expectTypeOf<Shape['isComponentCopyInstance']>().toExtend<
			NonNullable<PenpotShape['isComponentCopyInstance']>
		>()
	})
})
