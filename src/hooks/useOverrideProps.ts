import { ReactNode, useEffect, useReducer } from "react";
import { Custom, CustomPass, CustomRender, OverrideFn } from "../override";
import { store } from "../store";

export function useOverrideProps<E,D>(override: OverrideFn<D>[], custom: Custom<E,D> | [], storeId: string) {

  const [,forceUpdate] = useReducer(x => x + 1, 0);

  const storeKeys: string[] = [];

  let overrideProps = {};

  if (custom && custom.length) {
    let [type, ] = custom;
    let fields: string[] = [];
    if (type == 'pass') {
      [,fields] = custom as CustomPass;
      
    } else if (type == 'render') {
      let [,,props] = custom as CustomRender<D>;

      if (Array.isArray(props)) {
        fields = props as string[];
      } else if (typeof props == 'function'){
        if (!override) override = [];
        override.push(props)
      }      
    }

    if (fields && fields.length) {
      for (let k of fields) {
        overrideProps = { ...overrideProps, [k]: store.data[storeId][k] }
        storeKeys.push(k)
      }
    }
  }

  if (override && override.length) {
    let proxy = store.proxy(storeId, (prop) => storeKeys.push(prop));
    for (const fn of override) {
      overrideProps = { ...overrideProps, ...fn(proxy as D) }
    }
  }

  useEffect(() => {
    const subs = storeKeys && storeKeys.map(key => 
      store.subscribe(storeId, key, () => forceUpdate())
    )

    return () => {
      subs && subs.map(sub => sub.unsubscribed())
    }
  }, [])

  return overrideProps
}