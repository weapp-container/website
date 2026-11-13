import {parse} from 'parse5';

// Read actual attributes, never attribute-like text in highlighted examples,
// comments or script bodies. HTML parsing also decodes character references.
export function siteReferences(html) {
  const links = [], ids = new Set();
  const visit = node => {
    for (const attribute of node.attrs || []) {
      if (attribute.name === 'id') ids.add(attribute.value);
      if (attribute.name === 'href' || attribute.name === 'src') links.push(attribute.value);
    }
    node.childNodes?.forEach(visit);
    if (node.content) visit(node.content);
  };
  visit(parse(html));
  return {links, ids};
}
