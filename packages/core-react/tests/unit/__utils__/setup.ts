// The unit project's setup file. A unit test that needs network is in the wrong tier, so fetch
// throws to say so: write the integration spec instead of stubbing past it.
import { vi } from 'vitest'

vi.stubGlobal('fetch', () => {
	throw new Error('network in unit tier: write an integration spec')
})
