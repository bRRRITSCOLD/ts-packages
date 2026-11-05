// The first two steps of `build`: tokens/tokens.json → dist/styles.css, then a copy of the token
// file to dist/tokens.json. Style Dictionary throws on a broken reference, failing the build.
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'

import { buildStyles, type TokenFile } from './styles.js'

const root = new URL('../', import.meta.url)
const tokenFile = new URL('tokens/tokens.json', root)
const dist = new URL('dist/', root)

const tokens = JSON.parse(await readFile(tokenFile, 'utf8')) as TokenFile
await mkdir(dist, { recursive: true })
await writeFile(new URL('styles.css', dist), await buildStyles(tokens))
await copyFile(tokenFile, new URL('tokens.json', dist))
