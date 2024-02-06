import { ReactElement, isValidElement } from 'react';
import type { CustomModel, CustomOverride, KeyValue, ModelValueFn, OverrideFn } from '.';
import type { ElementType } from './component';
import type { SplitKeyResult, UnionToIntersection } from '../utils';
import { Store } from '../store';

export interface OverrideModel {
  id: string;
  key: string;
  prop?: {
    element: ReactElement;
    key: string;
  };
  valueFn: ModelValueFn;
  keyProp: string;
  valueProp: string;
}

export interface OverrideData {
  node: {
    type: ElementType;
    props: KeyValue;
  };
  children: ReactElement;
  override: OverrideFn[];
  custom: CustomOverride;
  model?: OverrideModel;
}

type StoreOverride = KeyValue<OverrideData>;
type StoreOverrideMap = KeyValue<StoreOverride>;

export interface HookFnMap<D extends KeyValue> {
  [key: string]: (data: D) => unknown;
}

type HookOverride<S extends KeyValue> = HookFnMap<S> & { $$keyMap: Record<string, true> };
type HookOverrideMap = KeyValue<HookOverride<KeyValue>>;

type HookFnResultArray<S extends KeyValue, H extends HookFnMap<S>> = {
  [K in keyof H]: K extends string
    ? ReturnType<H[K]> extends readonly unknown[] | unknown[]
      ? SplitKeyResult<K, ReturnType<H[K]>>
      : Record<K, ReturnType<H[K]>>
    : never;
};

export type HookFnResults<
  S extends KeyValue,
  H extends HookFnMap<S>,
  A = HookFnResultArray<S, H>,
> = UnionToIntersection<A[keyof A]>;

export interface OverrideStore {
  useInit: (connectorId: string, data: KeyValue) => [value: KeyValue, set: (key: string, value: unknown) => void];
  useState: (connectorId: string, keys?: string[], except?: string[]) => KeyValue;
  useHooks: (connectorId: string, keys?: string[], except?: string[]) => KeyValue;
  useModel: (containerId: string, key?: string) => [value: unknown, set: (value: unknown) => void];
  useHooksInit: (connectorId: string) => [state: KeyValue, set: (key: string, value: unknown) => void];
}

const $Override = {
  /**
   * Data
   */
  data: {} as StoreOverrideMap,

  /**
   * Hooks
   */
  hooks: {} as HookOverrideMap,

  /**
   * Store
   */
  store: Store,
};

export const Override = {
  set(id: string, key: string, data: OverrideData) {
    if (!$Override.data[id]) $Override.data[id] = {};
    $Override.data[id][key] = data;
  },

  get(id: string, key: string) {
    return $Override.data[id]?.[key];
  },

  del(id: string) {
    delete $Override.data[id];
  },

  setHooks<S extends KeyValue>(id: string, hooks: HookOverride<S>) {
    $Override.hooks[id] = hooks as HookOverride<KeyValue>;
  },

  getHooks(id: string) {
    return $Override.hooks[id] ?? {};
  },

  useHook(id: string, key: string, state: KeyValue) {
    return $Override.hooks[id][key](state);
  },

  isHook(id: string, key: string) {
    return $Override.hooks[id]?.$$keyMap[key] ? true : false;
  },

  setStore(store: OverrideStore) {
    $Override.store = store;
  },

  getStore() {
    return $Override.store;
  },

  getModel(props: KeyValue, custom: CustomModel) {
    const model: OverrideModel = {
      id: '',
      key: '',
      valueFn: custom[3],
      valueProp: custom[4],
      keyProp: custom[5],
    };

    const keyFn = custom[2];

    if (!Array.isArray(keyFn)) {
      model.key = keyFn({ ...props });
      model.id = model.key;
    } else {
      let propKey;
      [model.key, propKey] = keyFn;

      if (isValidElement(props[model.key])) {
        model.prop = {
          element: props[model.key],
          key: typeof propKey == 'function' ? propKey(props[model.key].props) : propKey,
        };

        model.id = model.prop.key;
      }
    }

    return model;
  },
};
