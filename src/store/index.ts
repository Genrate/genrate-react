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

  useHooks: (connectorId, keys) => {
    const hookId = `${connectorId}--$$hooks`;

    const values: KeyValue = {};

    const states: KeyValue = {};

    const subKeys: string[] = [];
    if (keys) {
      for (const key of keys) {
        const result = store.get(hookId, key);

        if (typeof result != 'function') {
          const [data, set] = (() => useState(result))();
          states[key] = { data, set };
          subKeys.push(key);
        } else {
          values[key] = result;
        }
      }
    }

    for (const key in states) {
      values[key] = states[key]?.data;
    }

    useEffect(() => {
      if (!subKeys?.length) return;
      const subs = subKeys?.map((key) => store.subscribe(hookId, key, (val) => states[key]?.set(val)));

      return () => {
        subs?.map((sub) => sub.unsubscribed());
      };
    }, []);

    return values;
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
    const hookId = `${connectorId}--$$hooks`;
    if (!store.data[hookId]) {
      store.init(hookId, {});
    }

    return [
      store.data[connectorId],
      (key: string, value: unknown, init: boolean = true) => {
        store.set(hookId, key, value, { emit: !init });
      },
    ];
  },
};
