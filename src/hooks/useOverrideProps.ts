import { useEffect, useReducer } from "react";
import { Custom, CustomPass, CustomAttach, OverrideFn } from "../override";
import { store } from "../store";

export function useOverrideProps(override: OverrideFn[], custom: Custom | [], storeId: string) {

  const [,forceUpdate] = useReducer(x => x + 1, 0);

  const storeKeys: string[] = [];
  let exceptKeys: string[] = [];
  let newKeySub = false;

  let overrideProps = {};

  if (custom && custom.length) {
    let [type, ] = custom;
    let keys: string[] = [];
    if (type == 'pass') {
      let [,fields, except] = custom as CustomPass;
      if (typeof fields == 'boolean') {
        exceptKeys = except;
        newKeySub = fields;
        keys = Object.keys(store.data[storeId])
                     .filter(f => except.indexOf(f) < 0);
      } else {
        keys = fields;
      }
      
    } else if (type == 'attach') {
      let [,,props] = custom as CustomAttach;

      if (Array.isArray(props)) {
        keys = props as string[];
      } else if (typeof props == 'function'){
        if (!override) override = [];
        override.push(props)
      }      
    }

    if (keys && keys.length) {
      for (let k of keys) {
        overrideProps = { ...overrideProps, [k]: store.get(storeId, k) }
        storeKeys.push(k)
      }
    }
  }

  if (override && override.length) {
    let proxy = store.proxy(storeId, (prop) => storeKeys.push(prop));
    for (const fn of override) {
      overrideProps = { ...overrideProps, ...fn(proxy) }
    }
  }

  useEffect(() => {

    if (!storeKeys || !storeKeys.length) return;

    if (newKeySub) {
      store.subscribe(storeId, ':new-key', (key) => {
        return (exceptKeys.indexOf(key) < 0) && forceUpdate()
      })
    }

    const subs = storeKeys && storeKeys.map(key => 
      store.subscribe(storeId, key, () => forceUpdate())
    )

    return () => {
      subs && subs.map(sub => sub.unsubscribed())
    }
  }, [])

  return overrideProps as { [key: string ]: any}
}