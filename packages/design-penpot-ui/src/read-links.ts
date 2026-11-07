import { type PageLinks, type PenpotShape, readPage } from './adapter.js'

/** The read-only slice of the `penpot` global the link reader uses. */
export type ReaderPenpot = {
	readonly currentFile: { readonly id: string; readonly name: string } | null
	readonly currentPage: { readonly name: string; readonly root: PenpotShape } | null
}

/** Every component link on the open page, by top-level layer, in visual order. */
export type ReadLinksResult = { file: string; page: string; layers: PageLinks[] }

/**
 * The link reader: every component link on the open page design in one call, in visual order.
 * `read-links.js` is this function bundled with a trailing `return readLinks(penpot)`, so it
 * runs as the body of one MCP `execute_code` call.
 */
export const readLinks = (penpot: ReaderPenpot): ReadLinksResult => {
	const { currentFile, currentPage } = penpot
	if (!currentFile || !currentPage) throw new Error('read-links: no file or page is open')
	return {
		file: currentFile.name,
		page: currentPage.name,
		layers: readPage(currentPage.root, { currentFileId: currentFile.id }),
	}
}
