import { useEffect, useReducer } from 'react';
import { Custom, CustomPass, CustomAttach, OverrideFn, KeyValue, CustomQuery } from '../override';
import { store } from '../store';

export function useOverrideProps(override: OverrideFn[], custom: Custom | [], storeId: string) {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const storeKeys: string[] = [];
  let exceptKeys: string[] = [];
  let newKeySub = false;

  let overrideProps: KeyValue = {};
  let overrideItems: Array<KeyValue | CustomAttach | CustomQuery> = [];

  if (custom?.length) {
    const [type] = custom;
    let keys: string[] = [];

    /**
     * Parse `pass` keys to subscribe
     */
    if (type == 'pass') {
      const [, , fields, except] = custom as CustomPass;
      if (typeof fields == 'boolean') {
        exceptKeys = except;
        newKeySub = fields;
        keys = Object.keys(store.data[storeId]).filter((f) => except.indexOf(f) < 0);
      } else {
        keys = fields;
      }

      /**
       * Parse `attach` keys to subscribe
       */
    } else if (type == 'attach') {
      const [, , , props] = custom as CustomAttach;
      if (Array.isArray(props)) {
        keys = props as string[];
      } else if (typeof props == 'function') {
        override.push(props);
      }
    }

    if (keys?.length) {
      for (const k of keys) {
        overrideProps = { ...overrideProps, [k]: store.get(storeId, k) };
        storeKeys.push(k);
      }
    }
  }

  if (override || custom) {
    const proxy = store.proxy(storeId, (prop) => storeKeys.push(prop));

    if (override.length) {
      for (const fn of override) {
        overrideProps = { ...overrideProps, ...fn(proxy) };
      }
    }

    /**
     * Parse `each` keys to subscribe
     */
    if (custom?.[0] == 'each') {
      const [, , itemsFn] = custom;
      overrideItems = itemsFn(proxy);
    }
  }

  useEffect(() => {
    if (newKeySub) {
      store.subscribe(storeId, ':new-key', (key) => {
        return exceptKeys.indexOf(key) < 0 && forceUpdate();
      });
    }

    if (!storeKeys?.length) return;

    const subs = storeKeys?.map((key) => store.subscribe(storeId, key, () => forceUpdate()));

    return () => {
      subs?.map((sub) => sub.unsubscribed());
    };
  }, []);

  return [overrideProps, overrideItems] as [KeyValue, Array<KeyValue | CustomAttach | CustomQuery>];
}
