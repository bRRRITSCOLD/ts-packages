import { describe, expect, it } from 'vitest'

// testee
import { checkDrift } from '../../src/drift-check.js'
// fixtures
import {
	createDriftCheckInput,
	createInStepLibrary,
	createLibraryComponent,
} from './__fixtures__/checkDrift.unit.fixtures.js'

describe('checkDrift', () => {
	it('should report no errors, unchecked components or coverage gaps for a library in step with the code', () => {
		expect(checkDrift(createDriftCheckInput())).toEqual({
			errors: [],
			unchecked: [],
			coverageGaps: [],
		})
	})

	describe('rule 1: component name → named export', () => {
		it('should pass a component whose name, path stripped, is an export', () => {
			const library = { card: createLibraryComponent({ path: 'Components', name: 'Card' }) }

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([])
		})

		it('should fail a component with no export of its name', () => {
			const library = {
				...createInStepLibrary(),
				badge: createLibraryComponent({ name: 'Badge' }),
			}

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([
				{
					rule: 1,
					component: 'Components/Badge',
					expected: 'export `Badge` in @brrritscold/core-react',
					found: 'no such export',
				},
			])
		})
	})
})
