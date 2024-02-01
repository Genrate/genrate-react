import React, { useEffect, useId } from 'react';
import {
  KeyValue,
  CustomModel,
  CustomPass,
  CustomAttach,
  override,
  Queries,
  ModelKey,
  ModelKeyFn,
  ModelValueFn,
  CustomQuery,
  CustomEach,
} from '../override';
import { get_used_keys } from '../utils';
import { Override } from '../override/override';
import { rebuild } from '../override/component';

interface ConnectorOptions<M extends KeyValue<unknown>> {
  useExtendOverrideMethods?: (connectorId: string, state: KeyValue) => M;
}

interface ConnectorInitProps extends KeyValue {
  connectorId: string;
  queries: Queries<KeyValue>;
  layout: (data: KeyValue) => JSX.Element;
  node: JSX.Element;
  keys: string[];
}

const ConnectorInit = React.memo((props: ConnectorInitProps) => {
  const { layout, keys, queries, connectorId } = props;
  const store = Override.getStore();
  const [data] = store.useData(connectorId, keys, keys);

  return override(layout(data), queries as Queries<KeyValue>, connectorId) as JSX.Element;
});

export function useConnectorCore<
  D extends KeyValue<unknown>,
  Data extends KeyValue<unknown> = D,
  M extends KeyValue<unknown> = KeyValue,
>(data?: Partial<D>, parentId?: string, options?: ConnectorOptions<M>) {
  const id = useId();
  const store = Override.getStore();
  const connectorId = parentId ?? id;

  const [state, setState] = store.useInit(connectorId, data ?? {});

  useEffect(() => () => Override.del(connectorId), []);

  function set(key: keyof D, value: D[typeof key]) {
    setState(key as string, value);
  }

  function model(
    key: ModelKey | ModelKeyFn = (p) => p.name,
    valueFn: ModelValueFn = (e) => (e.target as HTMLInputElement).value,
    valueProp = 'value',
    keyProp = 'onChange'
  ) {
    const keyFn = typeof key != 'string' ? key : () => key;

    if (Array.isArray(keyFn) && keyFn.length == 1) {
      keyFn.push((p) => p.name);
    }

    return ['model', connectorId, keyFn, valueFn, valueProp, keyProp] as CustomModel;
  }

  function pass(all: true): CustomPass;
  function pass(all: true, except: Array<keyof Data>): CustomPass;
  function pass(...fields: Array<keyof Data>): CustomPass;
  function pass(...fields: Array<keyof Data> | [true, Array<keyof Data>?]): CustomPass {
    if (!fields?.length) throw Error('No data specified to pass on');

    let keys: CustomPass[2] = fields as string[];
    let except: CustomPass[3] = [];
    if (fields[0] === true) {
      keys = fields[0];
      except = (fields[1] ?? []) as string[];
    }

    return ['pass', connectorId, keys, except];
  }

  function attach<F extends (props: KeyValue) => JSX.Element | null>(
    component: F,
    pass?: Array<keyof Data> | Parameters<F>[0] | ((data: Data) => Parameters<F>[0])
  ) {
    if (typeof pass != 'function' && !Array.isArray(pass)) {
      const res = { ...pass };
      pass = () => () => res;
    }

    return ['attach', connectorId, component, pass] as CustomAttach;
  }

  function query(queries: Queries<Data>) {
    return ['query', connectorId, queries] as CustomQuery;
  }

  function each(items: (data: Data) => () => Array<false | KeyValue | CustomQuery | CustomAttach>) {
    return ['each', connectorId, items] as CustomEach;
  }

  function view(layout: (data: KeyValue) => JSX.Element, queries: Queries<Data>) {
    const keys: string[] = [];

    const props = get_used_keys({ key: id, ...state }, (key) => keys.push(key));
    const node = layout(props);

    if (keys.length) {
      return rebuild(ConnectorInit, {
        key: id,
        node,
        layout,
        keys,
        queries: queries as Queries<KeyValue>,
        connectorId,
      });
    }

    return override(node, queries as Queries<KeyValue>, connectorId) as JSX.Element;
  }

  const customMethods = options?.useExtendOverrideMethods?.(connectorId, state) ?? {};

  return {
    ...(customMethods as M),
    id: connectorId,
    v: view,
    view,
    s: set,
    set,
    m: model,
    model,
    a: attach,
    attach,
    p: pass,
    pass,
    q: query,
    query,
    e: each,
    each,
  };
}

export function useConnector<Data extends KeyValue>(data?: Partial<Data>) {
  return useConnectorCore(data);
}
