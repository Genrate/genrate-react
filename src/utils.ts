import { ReactNode } from "react";

const REGEXP_WS ='[\\x20\\t\\r\\n\\f]';
const REGEXP_ID = `(?:\\\\[\\da-fA-F]{1,6}${REGEXP_WS}?|\\\\[^\\r\\n\\f]|[\\w-]|[^\0-\\x7f])+`;
const REGEXP_ATTR = `\\[${REGEXP_WS}*(${REGEXP_ID})(?:${REGEXP_WS}*([*^$|!~]?=)${REGEXP_WS}` + 
                    `*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(${REGEXP_ID}))|)${REGEXP_WS}*\\]`;

export type Attrs = { [key: string]: (string | boolean)[] }

export type Node = ReactNode & { type?: { name: string, render: { name: string }, type: { render: { name: string, displayName: string }}}}

export function get_tag_name(node: Node) {
  return node && node.type && ((
          node.type.name 
        ) || (
          node.type.render && 
          node.type.render.name
        ) || (
          node.type.type &&
          node.type.type.render && (
            node.type.type.render.displayName ||
            node.type.type.render.name
          )
        ))
}

export function extract_tag(selector: string) {
  const match = selector.match(new RegExp(`^(${REGEXP_ID}|[*])`))
  return match && match.length && match[0] || ''
}

export function extract_attributes(selector: string) {
  const attrs: Attrs = {}
  while (true) {

    if (selector && selector.length) {
      let attrMatch = selector.match(new RegExp(`^${REGEXP_ATTR}`));

      if (attrMatch && attrMatch.length) {
        selector = selector.replace(attrMatch[0], '');
        attrs[attrMatch[1]] = [attrMatch[2], attrMatch[5]] || true
        continue;
      }
    }

    break;
  }

  return attrs;
}

export function map_selector(selector: string, cb: (level: string) => void) {
  const levels = selector.trim().replace(new RegExp(`${REGEXP_WS}+`), ' ')
                            .match(/(\[.*?\]|[^\[\]\s]+)+(?=\s*|\s*$)/g);

  if (levels && levels.length) {
    for (let level of levels) {
      cb(level)
    }
  }
}

export function match_attrs(attrs: Attrs, props: { [key: string]: string | boolean }) {
  
  for (let a in attrs) {

    let [op, val] = attrs[a];

    if (
      (!val && !props[a]) ||
      (op == '=' && val != props[a]) ||
      (op == '~=' && props[a] && val && !new RegExp(`(^|[^A-Za-z])${val}([^A-Za-z]|$)`, 'g').test(props[a] as string)) ||
      (op == '*=' && props[a] && val && typeof val == 'string' && (props[a] as string).indexOf(val) < 0) ||
      (op == '^=' && props[a] && val && typeof val == 'string' && (props[a] as string).startsWith(val)) ||
      (op == '$=' && props[a] && val && typeof val == 'string' && (props[a] as string).endsWith(val))
    ) {
      return false;
    }
  }

  return true;
}
