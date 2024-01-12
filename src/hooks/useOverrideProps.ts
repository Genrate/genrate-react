import { useEffect, useReducer } from 'react';
import { CustomAttach, OverrideFn, KeyValue, CustomQuery, CustomOverride, CustomEach, CustomModel } from '../override';
import { store } from '../store';

export function useOverrideProps(override: OverrideFn[], custom: CustomOverride, storeId: string) {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const storeKeys: string[] = [];
  let exceptKeys: string[] = [];
  let newKeySub = false;

  let overrideProps: KeyValue = {};
  let overrideItems: Array<false | KeyValue | CustomAttach | CustomQuery> = [];
  const overrideCustom: CustomOverride = {};

  const keyMap: { [key: string]: boolean } = {};
  if (custom.passes?.length) {
    for (const pass of custom.passes) {
      const [, , fields, except] = pass;
      if (typeof fields == 'boolean') {
        exceptKeys = except;
        newKeySub = fields;
        Object.keys(store.data[storeId])
          .filter((f) => except.indexOf(f) < 0)
          .map((k) => (keyMap[k] = true));
      } else {
        fields.map((f) => (keyMap[f] = true));
      }
    }
  }

  Object.keys(keyMap)?.map((k) => {
    overrideProps = { ...overrideProps, [k]: store.get(storeId, k) };
  });

  if (override || custom) {
    const proxy = store.proxy(storeId, (prop) => (keyMap[prop] = true));

    if (override.length) {
      for (const fn of override) {
        const result = fn(proxy);

        if (Array.isArray(result)) {
          const [type] = result;

          if (['attach', 'query', 'each'].indexOf(type) > -1) {
            if (!custom.main && !overrideCustom.main) {
              overrideCustom.main = result as CustomAttach | CustomQuery | CustomEach;
            } else {
              console.warn(
                `An '${
                  custom.main?.[0] ?? overrideCustom.main?.[0]
                }' override is already applied, '${type}' override will be ignored`
              );
            }
          } else if (type == 'model') {
            if ((custom.main ?? overrideCustom.main)?.[0] == 'each') {
              console.warn(`An 'each' override is already applied, '${type}' override will be ignored`);
            } else {
              overrideCustom.model = result as CustomModel;
            }
          }
        } else {
          overrideProps = { ...overrideProps, ...fn(proxy) };
        }
      }
    }

    const main = overrideCustom?.main ?? custom?.main;

    if (main?.[0] == 'attach') {
      const [, , , props] = main;
      if (Array.isArray(props)) {
        props.map((p) => {
          keyMap[p] = true;
          if (!overrideProps[p]) {
            overrideProps = { ...overrideProps, [p]: store.get(storeId, p) };
          }
        });
      } else {
        overrideProps = { ...overrideProps, ...props(proxy) };
      }
    }

    if (main?.[0] == 'each') {
      const [, , itemsFn] = main;
      overrideItems = itemsFn(proxy);
    }
  }

  Object.keys(keyMap)?.map((k) => storeKeys.push(k));

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

  return [overrideProps, overrideItems, overrideCustom] as [
    KeyValue,
    Array<false | KeyValue | CustomAttach | CustomQuery>,
    CustomOverride,
  ];
}
