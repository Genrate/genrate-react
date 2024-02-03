import { KeyValue } from '../override';
import { Override } from '../override/override';

export function useData(connectorId: string, propKeys?: string[], subKeys?: string[], except?: string[]) {
  const store = Override.getStore();

  const stateKeys: string[] = [];
  const hooksKeys: string[] = [];

  if (subKeys?.length) {
    for (const key of subKeys) {
      if (Override.isHook(connectorId, key)) {
        hooksKeys.push(key);
      } else {
        stateKeys.push(key);
      }
    }
  }

  const state = store.useState(connectorId, stateKeys, except);
  const hooks = store.useHooks(connectorId, hooksKeys, except);

  const data = { ...state, ...hooks };

  const props: KeyValue = except !== undefined ? state : {};

  if (propKeys) {
    for (const prop of propKeys) {
      props[prop] = data[prop];
    }
  }

  return [props, data];
}
