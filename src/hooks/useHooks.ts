import { useLayoutEffect } from 'react';
import { KeyValue } from '../override';
import { Override } from '../override/override';

const useOverrideHook = (
  connId: string,
  key: string,
  state: KeyValue,
  setHook: <V>(key: string, value: V, init: boolean) => void
) => {
  const result = Override.useHook(connId, key, state);
  const deps = [];

  if (key.indexOf('|') > -1 && Array.isArray(result)) {
    key.split('|').forEach((k, i) => {
      if (typeof result[i] != 'function') {
        deps.push(JSON.stringify(result[i]));
      }
      setHook(k, result[i], true);
    });
  } else {
    if (typeof result != 'function') {
      deps.push(JSON.stringify(result));
    }
    setHook(key, result, true);
  }

  useLayoutEffect(() => {
    if (key.indexOf('|') > -1 && Array.isArray(result)) {
      key.split('|').forEach((k, i) => setHook(k, result[i], false));
    } else {
      setHook(key, result, false);
    }
  }, deps);
};

export const useOverrideHooks = (connId: string) => {
  const store = Override.getStore();
  const [state, setHook] = store.useHooksInit(connId);

  const keys = Object.keys(Override.getHooks(connId));
  for (const key of keys) {
    if (key.startsWith('$$')) continue;
    (() => useOverrideHook(connId, key, state, setHook))();
  }

  return null;
};
