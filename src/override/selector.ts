import { Attrs, extract_attributes, extract_tag, map_selector, match_attrs } from "../utils";

interface Tag { 
  tag: string, attrs: Attrs
}

interface SelectorMap { 
  [key: string]: Tag & ({ next: Tag[] }) 
}

interface TagMap { 
  [key: string]: SelectorMap 
}

const Matcher = {
  /**
   * Cache Selector
   */
  cache: {} as SelectorMap
}

export function matcher(selectors: string[], parent?: TagMap, child: TagMap = {}) {

  if (!parent) {
    parent = {};
    for (let selector of selectors) {

      if (Matcher.cache[selector]) {
        const tag = Matcher.cache[selector].tag;
        if (!parent[tag]) parent[tag] = {};
        parent[tag][selector] = Matcher.cache[selector];
        continue;
      }

      let selectorTag: string | null = null;

      map_selector(selector, (level) => {
        let tag = extract_tag(level);
        let attrs = {};
        if (tag || level.startsWith('[')) {
          attrs = extract_attributes(
            tag ? level.replace(tag, '') : level
          )
        }

        if (parent) {

          if (!tag) tag = '*';
          if (!selectorTag) selectorTag = tag;

          if (!parent[selectorTag]) parent[selectorTag] = {};

          if (!parent[selectorTag][selector]) {
            parent[selectorTag][selector] = { tag, attrs, next: [] }
          } else {
            parent[selectorTag][selector].next.push({ tag, attrs })
          }

          Matcher.cache[selector] = parent[tag][selector]
        }
      })

    }
  }

  return {
    child: {} as TagMap,

    match(name: string, props: { [key: string]: string })  {
      let result: string[] = [
        ...this.checkTag(child[name], props),
        ...this.checkTag(child['*'], props),
        ...this.checkTag((parent || {})[name], props),
        ...this.checkTag((parent || {})['*'], props),
      ]
      
      return result;
    },

    checkTag(matcher: SelectorMap, props: { [key: string]: string }) {
      let result: string[] = [];
      if (matcher) {
        for (let key in matcher) {

          const { attrs, next } = matcher[key];

          let isMatch = true;

          if (Object.keys(attrs).length) {
            isMatch = match_attrs(attrs, props);
          }

          if (isMatch) {

            if (!next.length) {
              result.push(key);
            } else {
              let nextTag = next[0].tag;
              if(!this.child[nextTag]) this.child[nextTag] = {};
              this.child[nextTag][key] = {
                ...next[0], next: next.filter((_v, i) => i != 0) 
              } 
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