import { useLayoutEffect, useRef } from 'react';
import { KeyValue } from '../override';
import { Override } from '../override/override';

const useOverrideHook = (connId: string, key: string, state: KeyValue, setHook: <V>(key: string, value: V) => void) => {
  const result = Override.useHook(connId, key, state);

  const isMounted = useRef(false);

  if (!isMounted.current) {
    if (key.indexOf('|') > -1 && Array.isArray(result)) {
      key.split('|').forEach((k, i) => setHook(k, result[i]));
    } else {
      setHook(key, result);
    }
  }

  useLayoutEffect(() => {
    if (key.indexOf('|') > -1 && Array.isArray(result)) {
      key.split('|').forEach((k, i) => setHook(k, result[i]));
    } else {
      setHook(key, result);
    }

    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, [result]);
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
