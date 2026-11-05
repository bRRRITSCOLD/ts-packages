// node_modules
import { describe, expect, it } from 'vitest'

// utils
import { rootExports, sourceFiles, storyTitle } from './__utils__/classes.js'

const stories = sourceFiles().filter((file) => file.endsWith('.stories.tsx'))

describe('story titles', () => {
	it('should title every story with a Penpot path whose component name is a `.` export', () => {
		const exports = new Set(rootExports())
		const offenders = stories
			.map((file) => ({ file, title: storyTitle(file) }))
			.filter(({ title }) => !exports.has(title?.split('/').at(-1) ?? ''))
			.map(({ file, title }) => `${file}: ${title}`)

		expect(stories.length).toBeGreaterThan(0)
		expect(offenders).toEqual([])
	})
})
