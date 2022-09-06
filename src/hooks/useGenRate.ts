import { ChangeEvent, ReactNode, useEffect, useId, useState } from "react";
import { store, Subscription } from '../store';
import { CustomModel, CustomPass, CustomRender, override, Overrides } from "../override";

export function useGenRate<Data>(props: Data) {

  const id = useId();

  if (props || !store.data[id]) {
    
    let initial = store.data[id] || {}
    for (let k in props) {
      if (k == 'gnode') continue;
      initial = { ...initial, [k]: (props as any)[k] };
    }

    store.data[id] = { ...initial };
  }

  const [state, setState] = useState<Data | undefined>(props)

  let keys: string[] = [];

  useEffect(() => {
    let subs: Subscription[] = [];
    console.log(keys);
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

  function set(key: string, value: any) {
    store.set(id, key, value)
  }

  function model<E extends ChangeEvent<{ value: any }>>(
    key: string | ((p: { [key: string]: any }) => string), 
    valueFn = (e: E) => e.target.value,
    valueProp = 'value',
    keyProp = 'onChange',
  ) {
    const keyFn = typeof key == 'function' ? key : () => key
    return ['model', id, keyFn, valueFn, keyProp, valueProp] as CustomModel<E>;
  }

  function pass(...fields: (keyof Data)[]) {
    return ['pass', fields] as CustomPass;
  }

  function render(element: ReactNode | ((props: any) => ReactNode), props: (keyof Data)[] | ((data: Data) => ({ [key: string]: any }))) {
    return ['render', element, props] as CustomRender<Data>
  }

  function view<E>(template: ((data: Data) => ReactNode) | ReactNode, selectors: Overrides<E, Data>) {

    if ((props as any).gnode && 
        (props as any).gnode.type &&
        typeof (props as any).gnode.type == 'function') {
      template = (props as any).gnode.type;
    }

    const proxy = store.proxy(id, (prop) => keys.push(prop as string))
    const node = typeof template == 'function' ? template(proxy as Data) : template;

    return override(node, selectors, id);
  }

  return { view, set, model, render, pass };
}