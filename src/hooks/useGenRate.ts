import { ReactNode, useEffect, useId, useState } from "react";
import { store, Subscription } from '../store';
import { CustomModel, CustomPass, CustomAttach, override, Overrides, ModelKey, ModelKeyFn, ModelValueFn } from "../override";

type KeyValue = { [key: string]: any };
export function useGenRate<Data extends KeyValue>(data?: Data) {
  
  const id = useId();

  store.init<Data>(id, (data || {}) as Data);

  const [state, setState] = useState(data as Data)

  let keys: string[] = [];

  useEffect(() => {
    let subs: Subscription[] = [];
    if (!subs.length && keys?.length) {
      subs = keys && keys.map(key => 
        store.subscribe(id, key, (value) => setState({ ...state, [key]: value } as Data))
      )
    }

    return () => {
      subs && subs.map(sub => sub.unsubscribed())
      store.del(id)
    };
  }, [])

  function set(key: keyof Data, value: Data[typeof key]) {
    store.set(id, key as string, value)
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

    return ['model', id, keyFn, valueFn, valueProp, keyProp] as CustomModel;
  }

  function pass(all: true): CustomPass;
  function pass(all: true, except: (keyof Data)[]): CustomPass;
  function pass(...fields: (keyof Data)[]): CustomPass;
  function pass(...fields: (keyof Data)[] | [true, (keyof Data)[]?]): CustomPass {

    if (!fields || !fields.length) throw Error('No data specified to pass on')

    let keys: CustomPass[1] = fields as string[]; 
    let except: CustomPass[2] = [];
    if (fields[0] === true) {
      keys = fields[0];
      except = (fields[1] || []) as string[]
    }

    return ['pass', keys, except];
  }

  function attach<F extends (props: any) => ReactNode>(
    component: F, 
    pass?: (keyof Data)[] | Parameters<F>[0] | ((data: Data) => Parameters<F>[0])
  ) {
    if (['function', 'array'].indexOf(typeof pass) < 0) {
      const res = { ...pass };
      pass = () => res;
    }

    return ['attach', component, pass] as CustomAttach
  }

  function view(template: (data: any) => ReactNode, selectors: Overrides<Data>) {

    if (data && (data as any).gcomponent &&
        typeof (data as any).gcomponent == 'function') {
      template = (data as any).gcomponent;
    }

    const proxy = store.proxy(id, (prop) => keys.push(prop as string))
    const node = template(proxy);

    return override(node, selectors as Overrides<any>, id);
  }

  return { view, set, model, attach, pass };
}