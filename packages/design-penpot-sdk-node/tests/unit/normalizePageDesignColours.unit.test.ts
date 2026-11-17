// node_modules
import { describe, expect, it } from 'vitest'

// testee
import { normalizePageDesignColours } from '../../src/stale-colours.js'
// fixtures
import { getFileBody, loadRecording } from '../__recordings__/recordings.js'

type RawShape = Record<string, unknown> & { id: string; name: string }
type RawFile = {
	id: string
	name: string
	data: {
		pagesIndex: Record<string, { name: string; objects: Record<string, RawShape> }>
		tokensLib?: Record<string, unknown> | null
	}
}

/** A fresh, mutable copy of the recorded `get-file` answer for the fixture file. */
const fixtureFile = () => getFileBody(loadRecording('snapshot-fixture')) as RawFile

const objects = (file: RawFile) => Object.values(file.data.pagesIndex)[0].objects

const CARD = 'ddf1f9c4-3aa4-4ebe-9dca-e47ac3885ab1'
const HEADER_COPY = 'e563c236-a6df-48d1-91f9-65b12f9b7f35'
const LABEL = '584ae1da-3866-4e7e-85c7-a872a357075c'

describe('normalizePageDesignColours', () => {
	it("should read the file's name, active themes and active sets in precedence order", () => {
		const colours = normalizePageDesignColours(fixtureFile())

		expect(colours).toMatchObject({
			fileId: 'de716cff-f170-81a2-8008-e6482008d970',
			fileName: 'snapshot-fixture',
			activeThemes: ['Mode/Light'],
			// $metadata.activeSets is ['light', 'primitive']; tokenSetOrder puts primitive first.
			activeSets: ['primitive', 'light'],
			tokenThemes: [
				{ group: 'Mode', name: 'Dark', sets: ['dark', 'primitive'] },
				{ group: 'Mode', name: 'Light', sets: ['light', 'primitive'] },
			],
		})
		expect(Object.keys(colours.tokens).sort()).toEqual(['dark', 'light', 'primitive'])
	})

	it('should read every layer applying a token to a fill or stroke colour, with its top-level board', () => {
		const { layers } = normalizePageDesignColours(fixtureFile())

		expect(layers).toHaveLength(9)
		expect(layers.filter(({ layerId }) => layerId === CARD)).toEqual([
			{
				page: 'Page 1',
				board: 'Card',
				layerId: CARD,
				layerName: 'Card',
				copy: false,
				attribute: 'fill',
				token: 'background',
				colours: [{ hex: '#ffffff', opacity: 1 }],
			},
			{
				page: 'Page 1',
				board: 'Card',
				layerId: CARD,
				layerName: 'Card',
				copy: false,
				attribute: 'stroke-color',
				token: 'border',
				colours: [{ hex: '#e5e5e5', opacity: 1 }],
			},
		])
	})

	it('should mark a layer inside a component copy as a copy', () => {
		const { layers } = normalizePageDesignColours(fixtureFile())

		expect(layers.find(({ layerId }) => layerId === HEADER_COPY)).toMatchObject({
			board: 'Card',
			copy: true,
			token: 'color.neutral.100',
		})
	})

	it("should read a text layer's fill from its text runs", () => {
		const file = fixtureFile()
		const label = objects(file)[LABEL] as RawShape & { content: Record<string, unknown> }
		const run = { text: 'Go', fills: [{ fillColor: '#0A0A0A', fillOpacity: 0.5 }] }
		label.content = {
			type: 'root',
			fills: [{ fillColor: '#123456', fillOpacity: 1 }],
			children: [
				{ type: 'paragraph-set', children: [{ type: 'paragraph', children: [run] }] },
			],
		}

		const layer = normalizePageDesignColours(file).layers.find(
			({ layerId }) => layerId === LABEL
		)

		// The root and paragraph fills are not drawn; only the runs' are.
		expect(layer?.colours).toEqual([{ hex: '#0a0a0a', opacity: 0.5 }])
	})

	it('should read only the first fill or stroke, and none for a gradient fill', () => {
		const file = fixtureFile()
		const card = objects(file)[CARD]
		card.fills = [{ fillColorGradient: { type: 'linear', stops: [] }, fillOpacity: 1 }]
		card.strokes = [
			{ strokeColor: '#e5e5e5', strokeOpacity: 1 },
			{ strokeColor: '#ff0000', strokeOpacity: 1 },
		]

		const layers = normalizePageDesignColours(file).layers.filter(
			({ layerId }) => layerId === CARD
		)

		expect(layers.map(({ colours }) => colours)).toEqual([[], [{ hex: '#e5e5e5', opacity: 1 }]])
	})

	it('should read a file with no tokens as no layers and no active sets', () => {
		const file = fixtureFile()
		file.data.tokensLib = null

		expect(normalizePageDesignColours(file)).toMatchObject({
			activeThemes: [],
			activeSets: [],
			tokens: {},
		})
	})

	it('should throw, naming where, when get-file changes shape', () => {
		const file = fixtureFile()
		objects(file)[CARD].appliedTokens = { fill: 42 }

		expect(() => normalizePageDesignColours(file)).toThrow(
			/Penpot get-file changed shape at get-file\.data\.pagesIndex\.[^.]+\.objects\.ddf1f9c4/
		)
	})

	it('should throw when the tokens lib loses its $metadata', () => {
		const file = fixtureFile()
		delete (file.data.tokensLib as Record<string, unknown>).$metadata

		expect(() => normalizePageDesignColours(file)).toThrow(/tokensLib/)
	})
})
