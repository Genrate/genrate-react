import { ReactElement, isValidElement } from 'react';
import type { CustomModel, CustomOverride, KeyValue, ModelValueFn, OverrideFn } from '.';
import type { ElementType } from './component';
import type { SplitKeyResult, UnionToIntersection } from '../utils';

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

export type HookFn<D extends KeyValue<unknown>, R = unknown> = (data: D) => R;
type HookOverride = KeyValue<HookFn<KeyValue<unknown>>> & { $$keyMap: Record<string, true> };
type HookOverrideMap = KeyValue<HookOverride>;

type HookFnResultArray<H extends KeyValue<HookFn<KeyValue<unknown>>>> = {
  [K in keyof H]: K extends string
    ? ReturnType<H[K]> extends readonly unknown[] | unknown[]
      ? SplitKeyResult<K, ReturnType<H[K]>>
      : Record<K, ReturnType<H[K]>>
    : never;
};

export type HookFnResults<
  H extends KeyValue<HookFn<KeyValue<unknown>>>,
  A = HookFnResultArray<H>,
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
  store: {} as OverrideStore,
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

  setHooks(id: string, hooks: HookOverride) {
    $Override.hooks[id] = hooks;
  },

  getHooks(id: string) {
    return $Override.hooks[id] ?? {};
  },

  useHook(id: string, key: string, state: KeyValue) {
    return $Override.hooks[id][key](state);
  },

  isHook(id: string, key: string) {
    return $Override.hooks[id]?.[key] ? true : false;
  },

  setStore(store: OverrideStore) {
    $Override.store = store;
  },

  extendStore(store: Partial<OverrideStore>) {
    $Override.store = { ...$Override.store, ...store };
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
