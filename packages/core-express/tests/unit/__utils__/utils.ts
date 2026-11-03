// utils
import { load } from '@brrritscold/core-node/dotenv'

export const setup = async () => {
	load({ path: '.env.unit.test', override: true, quiet: true })
}

export const teardown = async () => {
	load({ path: '.env.unit.test', override: true, quiet: true })
}
