import type {
	Board,
	CommonLayout,
	Fill,
	Penpot,
	Shape,
	ShapeBase,
	Stroke,
	Text,
	Token,
	TokenSet,
	TokenTheme,
} from '@penpot/plugin-types'
import { describe, expectTypeOf, it } from 'vitest'
// testee
import type {
	PenpotShape,
	PenpotToken,
	PenpotTokenSet,
	PenpotTokenTheme,
	TokenSyncPenpot,
} from '../../src/token-sync.js'

// The contract between the token sync's fakes and Penpot's plugin API, checked by `typecheck`
// against the plugin typings pinned to Penpot 2.18.6 (`@penpot/plugin-types` 1.5.0). Penpot can't
// run in hosted CI, so the live objects are checked by hand.
//
// The plugin API's types must be assignable to the slice, so every member the script reads or
// calls exists with a type the script accepts. Methods compare as methods do in TypeScript, with
// their parameters checked both ways, which leaves room for the divergences `token-sync.ts`
// documents on `PenpotTokenSet.addToken` and `PenpotShape.applyToken`.
describe('TokenSyncPenpot', () => {
	it("should accept the plugin API's penpot global", () => {
		expectTypeOf<Penpot>().toExtend<TokenSyncPenpot>()
	})

	it("should read the open file's library id as the plugin API declares it", () => {
		expectTypeOf<Penpot['library']['local']['id']>().toEqualTypeOf<
			TokenSyncPenpot['library']['local']['id']
		>()
	})

	it("should accept the plugin API's tokens, token sets and token themes", () => {
		expectTypeOf<Token>().toExtend<PenpotToken>()
		expectTypeOf<TokenSet>().toExtend<PenpotTokenSet>()
		expectTypeOf<TokenTheme>().toExtend<PenpotTokenTheme>()
	})

	it("should accept every kind of the plugin API's shapes", () => {
		expectTypeOf<Shape>().toExtend<PenpotShape>()
	})

	// An optional slice member would still pass the checks above if Penpot dropped it, so each one
	// the script reads is checked to exist where Penpot declares it.
	it('should read optional shape members the plugin API still declares', () => {
		expectTypeOf<ShapeBase>().toHaveProperty('tokens')
		expectTypeOf<ShapeBase>().toHaveProperty('isComponentCopyInstance')
		expectTypeOf<ShapeBase>().toHaveProperty('componentHead')
		expectTypeOf<ShapeBase>().toHaveProperty('fills')
		expectTypeOf<ShapeBase>().toHaveProperty('strokes')
		expectTypeOf<ShapeBase>().toHaveProperty('opacity')
		expectTypeOf<ShapeBase>().toHaveProperty('shadows')
		expectTypeOf<ShapeBase>().toHaveProperty('borderRadiusTopLeft')
		expectTypeOf<ShapeBase>().toHaveProperty('borderRadiusTopRight')
		expectTypeOf<ShapeBase>().toHaveProperty('borderRadiusBottomRight')
		expectTypeOf<ShapeBase>().toHaveProperty('borderRadiusBottomLeft')
		expectTypeOf<ShapeBase>().toHaveProperty('width')
		expectTypeOf<ShapeBase>().toHaveProperty('height')
		expectTypeOf<Fill>().toHaveProperty('fillColor')
		expectTypeOf<Stroke>().toHaveProperty('strokeColor')
		expectTypeOf<Stroke>().toHaveProperty('strokeWidth')
		expectTypeOf<Text>().toHaveProperty('fontFamily')
		expectTypeOf<Text>().toHaveProperty('fontId')
		expectTypeOf<Text>().toHaveProperty('fontSize')
		expectTypeOf<Text>().toHaveProperty('fontWeight')
		expectTypeOf<Text>().toHaveProperty('letterSpacing')
		expectTypeOf<Text>().toHaveProperty('lineHeight')
		expectTypeOf<Text>().toHaveProperty('textTransform')
		expectTypeOf<Text>().toHaveProperty('textDecoration')
		expectTypeOf<Board>().toHaveProperty('children')
		expectTypeOf<Board>().toHaveProperty('flex')
		expectTypeOf<Board>().toHaveProperty('grid')
	})

	it('should read layout paddings and gaps the plugin API still declares', () => {
		expectTypeOf<CommonLayout>().toHaveProperty('leftPadding')
		expectTypeOf<CommonLayout>().toHaveProperty('rightPadding')
		expectTypeOf<CommonLayout>().toHaveProperty('topPadding')
		expectTypeOf<CommonLayout>().toHaveProperty('bottomPadding')
		expectTypeOf<CommonLayout>().toHaveProperty('rowGap')
		expectTypeOf<CommonLayout>().toHaveProperty('columnGap')
	})
})
