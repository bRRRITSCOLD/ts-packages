// PROTOTYPE. Body of one MCP execute_code call, run in the Library file.
// Token sync: make the Penpot token catalog equal tokens.json (code wins).
// The agent inlines tokens.json as TOKENS. Idempotent: a second run reports 0 changes.
const TOKENS = {"primitive":{"color":{"neutral":{"0":{"$type":"color","$value":"#ffffff"},"100":{"$type":"color","$value":"#f4f4f5"},"200":{"$type":"color","$value":"#e4e4e7"},"500":{"$type":"color","$value":"#71717a"},"800":{"$type":"color","$value":"#27272a"},"900":{"$type":"color","$value":"#18181b"},"950":{"$type":"color","$value":"#09090b"}},"red":{"500":{"$type":"color","$value":"#ef4444"},"700":{"$type":"color","$value":"#b91c1c"}}},"radius":{"md":{"$type":"dimension","$value":"8px"}}},"light":{"background":{"$type":"color","$value":"{color.neutral.0}"},"foreground":{"$type":"color","$value":"{color.neutral.950}"},"primary":{"$type":"color","$value":"{color.neutral.900}"},"primary-foreground":{"$type":"color","$value":"{color.neutral.0}"},"secondary":{"$type":"color","$value":"{color.neutral.100}"},"secondary-foreground":{"$type":"color","$value":"{color.neutral.900}"},"destructive":{"$type":"color","$value":"{color.red.500}"},"border":{"$type":"color","$value":"{color.neutral.200}"},"muted-foreground":{"$type":"color","$value":"{color.neutral.500}"},"radius":{"$type":"dimension","$value":"{radius.md}"}},"dark":{"background":{"$type":"color","$value":"{color.neutral.950}"},"foreground":{"$type":"color","$value":"{color.neutral.0}"},"primary":{"$type":"color","$value":"{color.neutral.100}"},"primary-foreground":{"$type":"color","$value":"{color.neutral.900}"},"secondary":{"$type":"color","$value":"{color.neutral.800}"},"secondary-foreground":{"$type":"color","$value":"{color.neutral.0}"},"destructive":{"$type":"color","$value":"{color.red.700}"},"border":{"$type":"color","$value":"{color.neutral.800}"},"muted-foreground":{"$type":"color","$value":"{color.neutral.500}"},"radius":{"$type":"dimension","$value":"{radius.md}"}}};
const THEMES = [{ group: 'Mode', name: 'Light', sets: ['primitive', 'light'] }, { group: 'Mode', name: 'Dark', sets: ['primitive', 'dark'] }];

const flatten = (obj, prefix = []) => Object.entries(obj).flatMap(([k, v]) =>
  v && typeof v === 'object' && '$value' in v ? [{ name: [...prefix, k].join('.'), type: v.$type, value: String(v.$value) }] : flatten(v, [...prefix, k]));
const catalog = penpot.library.local.tokens;
const changes = [];
for (const [setName, tree] of Object.entries(TOKENS)) {
  let set = catalog.sets.find(s => s.name === setName);
  if (!set) { set = catalog.addSet({ name: setName }); changes.push(`+set ${setName}`); }
  const want = flatten(tree);
  for (const t of want) {
    const have = set.tokens.find(x => x.name === t.name);
    if (!have) { set.addToken(t); changes.push(`+${setName}/${t.name}`); }
    else if (have.type !== t.type || String(have.value) !== t.value) { have.remove(); set.addToken(t); changes.push(`~${setName}/${t.name}`); }
  }
  for (const extra of set.tokens.filter(x => !want.some(t => t.name === x.name))) { extra.remove(); changes.push(`-${setName}/${extra.name}`); }
}
for (const extra of catalog.sets.filter(s => !(s.name in TOKENS))) { extra.remove(); changes.push(`-set ${extra.name}`); }
for (const th of THEMES) {
  let theme = catalog.themes.find(t => t.group === th.group && t.name === th.name);
  if (!theme) { theme = catalog.addTheme({ group: th.group, name: th.name }); changes.push(`+theme ${th.group}/${th.name}`); }
  const have = theme.activeSets.map(s => s.name);
  for (const s of th.sets.filter(s => !have.includes(s))) { theme.addSet(catalog.sets.find(x => x.name === s)); changes.push(`+${th.name}<-${s}`); }
  for (const s of have.filter(s => !th.sets.includes(s))) { theme.removeSet(s); changes.push(`-${th.name}<-${s}`); }
}
const light = catalog.themes.find(t => t.group === 'Mode' && t.name === 'Light');
if (!light.active) { light.toggleActive(); changes.push('activate Light'); }
return { changes: changes.length, detail: changes.slice(0, 12), sets: catalog.sets.map(s => `${s.name}:${s.tokens.length}`), themes: catalog.themes.map(t => `${t.group}/${t.name}[${t.activeSets.map(s => s.name)}]${t.active ? '*' : ''}`) };
