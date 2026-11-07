// The plugin's main code: Penpot runs this bundle with the `penpot` global in scope.
import type { Penpot } from '@penpot/plugin-types'

import { startLinkInspector } from '../plugin.js'

declare const penpot: Penpot

startLinkInspector(penpot)
