

const REGEXP_WS ='[\\x20\\t\\r\\n\\f]';
const REGEXP_ID = `(?:\\\\[\\da-fA-F]{1,6}${REGEXP_WS}?|\\\\[^\\r\\n\\f]|[\\w-]|[^\0-\\x7f])+`;
const REGEXP_ATTR = `\\[${REGEXP_WS}*(${REGEXP_ID})(?:${REGEXP_WS}*([*^$|!~]?=)${REGEXP_WS}` + 
                    `*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(${REGEXP_ID}))|)${REGEXP_WS}*\\]`;

type Attrs = { [key: string]: (string | boolean)[] }

function extract_tag(selector: string) {
  const match = selector.match(new RegExp(`^(${REGEXP_ID}|[*])`))
  return match && match.length && match[0] || ''
}

function extract_attributes(selector: string) {
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

function map_selector(selector: string, cb: (level: string) => void) {
  const levels = selector.trim().replace(new RegExp(`${REGEXP_WS}+`), ' ')
                            .match(/(\[.*?\]|[^\[\]\s]+)+(?=\s*|\s*$)/g);

  if (levels && levels.length) {
    for (let level of levels) {
      cb(level)
    }
  }
}

function match_attrs(attrs: Attrs, props: { [key: string]: string | boolean }) {
  
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

interface SelectorMap { 
  [key: string]: ({ tag: string, attrs: Attrs })[] 
}

export function matcher(selectors: string[], parent?: SelectorMap, child: SelectorMap = {}) {


  if (!parent) {
    parent = {};
    for (let selector of selectors) {
      map_selector(selector, (level) => {
        let tag = extract_tag(level);
        let attrs = {};
        if (tag || level.startsWith('[')) {
          attrs = extract_attributes(
            tag ? level.replace(tag, '') : level
          )
        }

        if (parent) {
          if (!parent[selector]) parent[selector] = []
          parent[selector].push({ tag, attrs })
        }
      })
    }
  }

  return {
    child: {} as SelectorMap,

    match(name: string, props: { [key: string]: string })  {
      let matchers = [ child || {}, parent ];
      
      let result: string[] = []
      for (let matcher of matchers) {
        for (let key in matcher) {
          const { tag, attrs } = matcher[key][0];

          let isMatch = false;

          if (!tag || tag == name) {
            isMatch = tag == name;
            if (Object.keys(attrs)) {
              isMatch = match_attrs(attrs, props);
            }
          }

          if (isMatch) {
            if (matcher[key].length == 1) {
              result.push(key);
            } else {
              if(this.child[key]) this.child[key] = [];
              this.child[key] = [ 
                ...this.child[key], 
                ...matcher[key].filter((_v, i) => i != 0)
              ]
            }
          }
        }
      }
      
      return result;
    },

    next() {
      return matcher(selectors, parent, this.child)
    }
  }





}