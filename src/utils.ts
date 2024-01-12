import { ReactNode } from 'react';

const REGEXP_WS = '[\\x20\\t\\r\\n\\f]';
const REGEXP_ID = `(?:\\\\[\\da-fA-F]{1,6}${REGEXP_WS}?|\\\\[^\\r\\n\\f]|[\\w-]|[^\0-\\x7f])+`;
const REGEXP_ATTR =
  `\\[${REGEXP_WS}*(${REGEXP_ID})(?:${REGEXP_WS}*([*^$!~]?=)${REGEXP_WS}` +
  `*(?:'((?:\\\\.|[^\\\\'])*)'|"((?:\\\\.|[^\\\\"])*)"|(${REGEXP_ID}))|)${REGEXP_WS}*\\]`;

export type Attrs = { [key: string]: [string, string | undefined] | boolean };

export type Node = ReactNode & {
  type?: { name: string; render: { name: string }; type: { render: { name: string; displayName: string } } };
};

export function get_tag_name(node: Node) {
  return (
    /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
    (typeof node?.type == 'string' && node?.type) ||
    node?.type?.name ||
    node?.type?.render?.name ||
    node?.type?.type?.render?.displayName ||
    node?.type?.type?.render?.name
    /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
  );
}

export function extract_tag(selector: string) {
  const match = selector.match(new RegExp(`^(${REGEXP_ID}|[*])`));
  return (match?.length && match[0]) ?? '';
}

export function extract_attributes(selector: string) {
  const attrs: Attrs = {};
  for (;;) {
    if (selector?.length) {
      if (selector.endsWith('=]')) {
        selector = selector.replace(/=\]$/, '=undefined]');
      }

      const attrMatch = selector.match(new RegExp(`^${REGEXP_ATTR}`));
      if (attrMatch?.length) {
        selector = selector.replace(attrMatch[0], '');
        const value = attrMatch[3] || attrMatch[4] || attrMatch[5] || null;
        attrs[attrMatch[1]] = value && value != 'undefined' ? [attrMatch[2], value] : true;
        continue;
      } else {
        console.warn(`${selector} Error: failed to get selector value`);
        attrs['$$FAIL$$'] = ['=', '$$ATTR$$'];
      }
    }

    break;
  }

  return attrs;
}

export function map_selector(selector: string, cb: (level: string) => void) {
  const levels = selector
    .trim()
    .replace(new RegExp(`${REGEXP_WS}+`), ' ')
    .match(/(\[.*?\]|[^[\]\s]+)+(?=\s*|\s*$)/g);

  if (levels?.length) {
    for (const level of levels) {
      cb(level);
    }
  }
}

export function str_exact_contains(str: string, match: string) {
  return new RegExp(`(^|[^A-Za-z])${match}([^A-Za-z]|$)`, 'g').test(str);
}

export function match_attrs(attrs: Attrs, props: { [key: string]: string }) {
  for (const a in attrs) {
    if (attrs[a] === true) {
      if (!props[a]) return false;
      continue;
    }

    const [op, val] = attrs[a] as [string, string | undefined];

    if (val && props?.[a] && typeof props[a] != 'string' && typeof props[a] != 'number') {
      return false;
    }

    if (
      (op == '=' && props[a] != val) ||
      (op == '~=' && (!props[a] || !val || !str_exact_contains(props[a], val))) ||
      (op == '*=' && (!props[a] || !val || `${props[a]}`.indexOf(val) < 0)) ||
      (op == '^=' && (!props[a] || !val || !`${props[a]}`.startsWith(val))) ||
      (op == '$=' && (!props[a] || !val || !`${props[a]}`.endsWith(val)))
    ) {
      return false;
    }
  }

  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function get_value(oldValue: any, keys: string[], value: any): any {
  if (!keys?.length) {
    return value;
  }

  const key = keys.shift() as string;

  if (isNaN(+key)) {
    return {
      ...oldValue,
      [key]: get_value(oldValue[key], keys, value),
    };
  }

  if (!Array.isArray(oldValue)) oldValue = [];

  oldValue[key] = get_value(oldValue[key], keys, value);

  return oldValue;
}
