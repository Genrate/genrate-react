import React, { useId, useEffect, useMemo } from 'react';
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
import { HookFnMap, HookFnResults, Override } from '../override/override';
import { fragment, rebuild } from '../override/component';
import { useData } from './useData';
import { useOverrideHooks } from './useHooks';

interface ConnectorOptions<M extends KeyValue<unknown>> {
  useExtendOverrideMethods?: (connectorId: string, state: KeyValue) => M;
}

interface ConnectorInitProps extends KeyValue {
  connectorId: string;
  queries: Queries<KeyValue>;
  layout: (data: KeyValue) => JSX.Element;
  keys: string[];
}

const ConnectorInit = React.memo((props: ConnectorInitProps) => {
  const { layout, keys, queries, connectorId } = props;
  const [data] = useData(connectorId, keys, keys);

  const node = useMemo(
    () => override(layout(data), queries as Queries<KeyValue>, connectorId) as JSX.Element,
    keys.map((k) => JSON.stringify(data[k]))
  );

  return node;
});

export const ConnectorHooks = React.memo<{ id: string }>(({ id }) => {
  useOverrideHooks(id);
  return null;
});

type Input<S, H> = {
  state?: S;
  hooks?: H;
};

export function useConnectorCore<
  State extends KeyValue<unknown>,
  HookState extends KeyValue = State,
  Hooks extends KeyValue = HookFnMap<HookState>,
  Data extends KeyValue<unknown> = HookState & HookFnResults<HookState, Hooks>,
  M extends KeyValue<unknown> = KeyValue,
>(input?: Input<State, Hooks>, parentId?: string, options?: ConnectorOptions<M>) {
  const id = useId();
  const store = Override.getStore();
  const connectorId = parentId ?? id;

  const [state, setState] = store.useInit(connectorId, input?.state ?? {});

  if (input?.hooks) {
    const keys = Object.keys(input.hooks);
    if (keys.length) {
      const keyMap: Record<string, true> = {};
      keys.forEach((k) => {
        if (k.indexOf('|') > -1) {
          k.split('|').forEach((s) => (keyMap[s] = true));
        } else {
          keyMap[k] = true;
        }
      });

      Override.setHooks<State>(connectorId, { ...input.hooks, $$keyMap: keyMap });
    }
  }

  useEffect(() => () => Override.del(connectorId), []);

  function set(key: keyof State, value: State[typeof key]) {
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

  function attach<F extends (props: KeyValue) => JSX.Element | JSX.Element[] | null>(
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

    return fragment([
      rebuild(ConnectorHooks, { key: `hook-${id}`, id: connectorId }),
      keys.length
        ? rebuild(ConnectorInit, {
            key: id,
            layout,
            keys,
            queries: queries as Queries<KeyValue>,
            connectorId,
          })
        : (override(node, queries as Queries<KeyValue>, connectorId) as JSX.Element),
    ]);
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

export function useConnector<
  State extends KeyValue,
  HookState extends KeyValue = State,
  Hooks extends KeyValue = HookFnMap<HookState>,
  Data extends KeyValue<unknown> = HookState & HookFnResults<HookState, Hooks>,
>(data?: Input<State, Hooks>) {
  return useConnectorCore<State, HookState, Hooks, Data>(data);
}
