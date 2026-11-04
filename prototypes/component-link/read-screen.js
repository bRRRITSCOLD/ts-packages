// PROTOTYPE. Body of one MCP execute_code call: returns every component copy on a
// screen with its link (sharedPluginData brrritscold.core-react/link), variantProps and text.
const NS = 'brrritscold.core-react';
const walk = (s) => {
  if (s.hidden) return null;
  const node = { name: s.name, type: s.type };
  if (s.type === 'text') node.text = s.characters;
  if (s.isComponentCopyInstance() && s.isComponentHead()) {
    const c = s.component();
    const raw = c && c.getSharedPluginData(NS, 'link');
    node.component = c ? { name: c.name, path: c.path, library: c.libraryId === penpot.currentFile.id ? 'local' : 'Library' } : null;
    if (c && c.isVariant()) node.variantProps = c.variantProps;
    node.link = raw ? JSON.parse(raw) : null;
  }
  if (s.children && s.children.length) node.children = s.children.map(walk).filter(Boolean);
  return node;
};
const screen = penpotUtils.findShape(s => s.name === 'Notification settings', penpot.root);
return walk(screen);
