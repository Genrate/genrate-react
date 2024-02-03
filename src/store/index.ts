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

  useState: (connectorId, stateKeys, exceptKeys) => {
    const [, forceUpdate] = useReducer((x) => x + 1, 0);

    useEffect(() => {
      if (exceptKeys !== undefined) {
        store.subscribe(connectorId, ':new-key', (key) => {
          return exceptKeys.indexOf(key) < 0 && forceUpdate();
        });
      }

      if (!stateKeys?.length) return;

      const subs = stateKeys?.map((key) => store.subscribe(connectorId, key, () => forceUpdate()));

      return () => {
        subs?.map((sub) => sub.unsubscribed());
      };
    }, [stateKeys, exceptKeys]);

    const state: KeyValue = {};
    const storeData = store.data[connectorId];

    const keys = exceptKeys !== undefined ? Object.keys(storeData).filter((k) => exceptKeys.indexOf(k) < 0) : stateKeys;

    if (keys?.length) {
      for (const key of keys) {
        if (storeData[key]) {
          state[key] = storeData[key];
        }
      }
    }

    return state;
  },

  useHooks: (connectorId, subKeys, exceptKeys) => {
    const [, forceUpdate] = useReducer((x) => x + 1, 0);

    useEffect(() => {
      if (!subKeys?.length) return;

      const subs = subKeys?.map((key) => store.subscribe(`${connectorId}:hooks`, key, () => forceUpdate()));

      return () => {
        subs?.map((sub) => sub.unsubscribed());
      };
    }, [subKeys]);

    const state: KeyValue = {};
    const storeData = store.data[`${connectorId}:hooks`] ?? {};

    const keys = exceptKeys !== undefined ? Object.keys(storeData).filter((k) => exceptKeys.indexOf(k) < 0) : subKeys;

    if (keys?.length) {
      for (const key of keys) {
        if (storeData[key] !== undefined) {
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

  useHooksInit: (connectorId: string) => {
    if (!store.data[`${connectorId}:hooks`]) {
      store.init(`${connectorId}:hooks`, {});
    }

    return [
      store.data[connectorId],
      (key: string, value: unknown) => {
        store.set(`${connectorId}:hooks`, key, value);
      },
    ];
  },
};
