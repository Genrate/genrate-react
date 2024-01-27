import { useEffect, useReducer, useState } from 'react';
import { store } from './store';
import { get_value } from '../utils';
import { OverrideStore } from '../override/override';
import { KeyValue } from '../override';

export const Store: OverrideStore = {
  useInit: (connectorId, data) => {
    store.init(connectorId, data);

    useEffect(() => () => store.del(connectorId), []);

    return [store.data[connectorId] || {}, (key, value) => store.set(connectorId, key, value)];
  },

  useData: (connectorId, subKeys, exceptKeys) => {
    const [, forceUpdate] = useReducer((x) => x + 1, 0);

    useEffect(() => {
      if (exceptKeys !== undefined) {
        store.subscribe(connectorId, ':new-key', (key) => {
          return exceptKeys.indexOf(key) < 0 && forceUpdate();
        });
      }

      if (!subKeys?.length) return;

      const subs = subKeys?.map((key) => store.subscribe(connectorId, key, () => forceUpdate()));

      return () => {
        subs?.map((sub) => sub.unsubscribed());
      };
    }, [subKeys, exceptKeys]);

    const state: KeyValue = {};
    const storeData = store.data[connectorId];

    const keys = exceptKeys !== undefined ? Object.keys(storeData).filter((k) => exceptKeys.indexOf(k) < 0) : subKeys;

    if (keys?.length) {
      for (const key of keys) {
        if (storeData[key]) {
          state[key] = storeData[key];
        }
      }
    }

    return state;
  },

  useModel: (connectorId, key) => {
    const [data, setData] = useState<unknown>('');

    return [
      data,
      (value: unknown) => {
        setData(value);
        if (key) {
          if (key.indexOf('.') > -1) {
            const keys: string[] = key.split('.');
            const mainKey: string = keys.shift() as string;
            const oldValue = store.get(connectorId, mainKey);
            const newValue = get_value(oldValue, keys, value);
            store.set(connectorId, mainKey, newValue);
          } else {
            store.set(connectorId, key, value);
          }
        }
      },
    ];
  },
};
