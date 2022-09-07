import { ChangeEvent, ReactNode, useEffect, useId, useState } from "react";
import { store, Subscription } from '../store';
import { CustomModel, CustomPass, CustomAttach, override, Overrides, ModelKey, ModelKeyFn, ModelValueFn } from "../override";

export function useGenRate<Data>(props: Data) {

  const id = useId();

  store.init<Data>(id, props);

  const [state, setState] = useState<Data | undefined>(props)

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

  function set(key: string, value: any) {
    store.set(id, key, value)
  }

  function model(
    key: ModelKey | ModelKeyFn, 
    valueFn: ModelValueFn = (e) => e.target.value,
    valueProp = 'value',
    keyProp = 'onChange',
  ) {
    const keyFn = typeof key != 'string' ? key : () => key
    return ['model', id, keyFn, valueFn, valueProp, keyProp] as CustomModel;
  }

  function pass(...fields: (keyof Data)[]) {
    return ['pass', fields] as CustomPass;
  }

  function attach(element: ReactNode | ((props: any) => ReactNode), props: (keyof Data)[] | ((data: Data) => ({ [key: string]: any }))) {
    return ['attach', element, props] as CustomAttach
  }

  function view(template: ((data: Data) => ReactNode) | ReactNode, selectors: Overrides<Data>) {

    if ((props as any).gnode && 
        (props as any).gnode.type &&
        typeof (props as any).gnode.type == 'function') {
      template = (props as any).gnode.type;
    }

    const proxy = store.proxy(id, (prop) => keys.push(prop as string))
    const node = typeof template == 'function' ? template(proxy as Data) : template;

    return override(node, selectors as Overrides<any>, id);
  }

  return { view, set, model, attach, pass };
}