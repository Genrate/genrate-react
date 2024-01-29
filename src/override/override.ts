import { ReactElement, isValidElement } from 'react';
import { CustomModel, CustomOverride, KeyValue, ModelValueFn, OverrideFn } from '.';
import { ElementType } from './component';

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

export interface OverrideStore {
  useInit: (connectorId: string, data: KeyValue) => [value: KeyValue, set: (key: string, value: unknown) => void];
  useData: (
    connectorId: string,
    propKeys: string[],
    subKeys?: string[],
    except?: string[]
  ) => [props: KeyValue, state: KeyValue];
  useModel: (containerId: string, key?: string) => [value: unknown, set: (value: unknown) => void];
}

const $Override = {
  /**
   * Data
   */
  data: {} as StoreOverrideMap,

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
