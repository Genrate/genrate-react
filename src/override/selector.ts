import { Attrs, extract_attributes, extract_tag, map_selector, match_attrs } from "../utils";

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