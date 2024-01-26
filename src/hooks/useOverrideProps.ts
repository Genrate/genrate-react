import { useState } from 'react';
import { CustomAttach, OverrideFn, KeyValue, CustomQuery, CustomOverride, CustomEach, CustomModel } from '../override';
import { Override } from '../override/override';
import { get_used_keys } from '../utils';

export function useOverrideProps(override: OverrideFn[], custom: CustomOverride, connectorId: string) {
  const store = Override.getStore();
  const [dataParams, setDataParams] = useState<[string[] | undefined, string[] | undefined]>([undefined, undefined]);
  const storeData = store.useData(connectorId, ...dataParams);

  let exceptKeys: string[] | undefined;

  let overrideProps: KeyValue = {};
  let overrideItems: Array<false | KeyValue | CustomAttach | CustomQuery> = [];
  const overrideCustom: CustomOverride = {};

  const keyMap: KeyValue<boolean> = {};
  if (custom.passes?.length) {
    for (const pass of custom.passes) {
      const [, , fields, except] = pass;
      if (typeof fields == 'boolean') {
        exceptKeys = except;
        Object.keys(storeData)
          .filter((f) => except.indexOf(f) < 0)
          .map((k) => (keyMap[k] = true));
      } else {
        fields.map((f) => (keyMap[f] = true));
      }
    }
  }

  Object.keys(keyMap)?.map((k) => {
    overrideProps = { ...overrideProps, [k]: storeData[k] };
  });

  if (override || custom) {
    const proxy = get_used_keys(storeData, (prop) => (keyMap[prop] = true));

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
            overrideProps = { ...overrideProps, [p]: storeData[p] };
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

  if (dataParams[0] === undefined) {
    setDataParams([Object.keys(keyMap), exceptKeys]);
  }

  return [overrideProps, overrideItems, overrideCustom] as [
    KeyValue,
    Array<false | KeyValue | CustomAttach | CustomQuery>,
    CustomOverride,
  ];
}
