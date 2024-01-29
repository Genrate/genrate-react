import { CustomAttach, OverrideFn, KeyValue, CustomQuery, CustomOverride, CustomEach, CustomModel } from '../override';
import { Override } from '../override/override';
import { get_used_keys } from '../utils';

export function useOverrideProps(override: OverrideFn[], custom: CustomOverride, connectorId: string) {
  const store = Override.getStore();

  let exceptKeys: string[] | undefined;

  let overrideItems: Array<false | KeyValue | CustomAttach | CustomQuery> = [];
  const overrideCustom: CustomOverride = {};

  const keyMap: KeyValue<true> = {};
  const propKeyMap: KeyValue<true> = {};
  if (custom.passes?.length) {
    for (const pass of custom.passes) {
      const [, , fields, except] = pass;
      if (typeof fields == 'boolean') {
        exceptKeys = except;
      } else {
        fields.map((f) => {
          keyMap[f] = true;
          propKeyMap[f] = true;
        });
      }
    }
  }

  let itemsFn: CustomEach[2] | undefined;
  if (override || custom) {
    const proxy = get_used_keys({}, (prop) => (keyMap[prop] = true));

    override?.forEach((fn) => {
      try {
        fn(proxy);
      } catch (e) {
        // ignore fn error this is only for retrieving keys
      }
    });

    const main = overrideCustom?.main ?? custom?.main;

    if (main?.[0] == 'attach') {
      const [, , , attachProps] = main;
      if (Array.isArray(attachProps)) {
        attachProps.map((p) => {
          keyMap[p] = true;
          propKeyMap[p] = true;
        });
      } else {
        attachProps(proxy);
        override.push(attachProps);
      }
    }

    if (main?.[0] == 'each') {
      [, , itemsFn] = main;
      itemsFn(proxy);
    }
  }

  const [props, state] = store.useData(connectorId, Object.keys(propKeyMap), Object.keys(keyMap), exceptKeys);

  let overrideProps: KeyValue = props;

  for (const fn of override) {
    const result = fn(state);
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
    } else if (typeof result == 'function') {
      overrideProps = { ...overrideProps, ...result() };
    }
  }

  if (itemsFn) {
    overrideItems = itemsFn(state)();
  }

  return [overrideProps, overrideItems, overrideCustom] as [
    KeyValue,
    Array<false | KeyValue | CustomAttach | CustomQuery>,
    CustomOverride,
  ];
}
