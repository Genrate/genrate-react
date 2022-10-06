import { useEffect, useId, useState } from "react";
import { store, Subscription } from '../store';
import { CustomModel, CustomPass, CustomAttach, override, Queries, ModelKey, ModelKeyFn, ModelValueFn, CustomQuery } from "../override";

type GenRateData = { [key: string]: any };

export function useGenRate<Data extends GenRateData>(data?: Partial<Data>, storeId?: string) {
  
  const id = useId();

  const getStoreId = () => storeId || id

  store.init<Data>(getStoreId(), (data || {}) as Data);

  const [state, setState] = useState(data as Data)

  useEffect(() => {
    return () => {
      store.del(getStoreId())
    };
  }, [])

  function set(key: keyof Data, value: Data[typeof key]) {
    store.set(getStoreId(), key as string, value)
  }

  function model(
    key: ModelKey | ModelKeyFn = (p) => p.name, 
    valueFn: ModelValueFn = (e) => e.target.value,
    valueProp = 'value',
    keyProp = 'onChange',
  ) {

    const keyFn = typeof key != 'string' ? key : () => key

    if (Array.isArray(keyFn) && keyFn.length == 1) {
      keyFn.push((p) => p.name);
    }

    return ['model', getStoreId(), keyFn, valueFn, valueProp, keyProp] as CustomModel;
  }

  function pass(all: true): CustomPass;
  function pass(all: true, except: (keyof Data)[]): CustomPass;
  function pass(...fields: (keyof Data)[]): CustomPass;
  function pass(...fields: (keyof Data)[] | [true, (keyof Data)[]?]): CustomPass {

    if (!fields || !fields.length) throw Error('No data specified to pass on')

    let keys: CustomPass[2] = fields as string[]; 
    let except: CustomPass[3] = [];
    if (fields[0] === true) {
      keys = fields[0];
      except = (fields[1] || []) as string[]
    }

    return ['pass', getStoreId(), keys, except];
  }

  function attach<F extends (props: any) => JSX.Element>(
    component: F, 
    pass?: (keyof Data)[] | Parameters<F>[0] | ((data: Data) => Parameters<F>[0])
  ) {

    if (typeof pass != 'function' && !Array.isArray(pass)) {
      const res = { ...pass };
      pass = () => res;
    }

    return ['attach', getStoreId(), component, pass] as CustomAttach
  }

  function query(queries: Queries<Data>) {
    return ['query', getStoreId(), queries] as CustomQuery
  }

  function view(template: (data: any) => JSX.Element, queries: Queries<Data>) {
    
    let keys: string[] = [];

    const proxy = store.proxy(getStoreId(), (prop) => keys.push(prop as string))
    const node = template(proxy);

    if (!store.events[getStoreId()] && keys.length) {
      keys && keys.map(key => 
        store.subscribe(getStoreId(), key, (value) => setState({ ...state, [key]: value } as Data))
      )
    }

    return override(node, queries as Queries<any>, getStoreId()) as JSX.Element;
  }

  return { 
    v: view, view,
    s: set, set,
    m: model, model,
    a: attach, attach,
    p: pass, pass,
    q: query, query,
  };
}