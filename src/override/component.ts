import { ChangeEvent, cloneElement, createElement, ReactElement, useState } from "react";
import { Custom, CustomModel, CustomRender, OverrideFn } from ".";
import { useOverrideProps } from "../hooks/useOverrideProps";
import { store } from "../store";

interface OverrideProps<E,D> { 
  element: ReactElement, 
  children: ReactElement, 
  override: OverrideFn<D>[], 
  storeId: string, 
  custom: Custom<E,D> | [],
}

export function GenRateModel<E, D>(props: OverrideProps<E,D>) {
  const { element, override, custom, storeId, children } = props;

  const [data, setData] = useState<string | number | boolean>('');
  const overrideProps = useOverrideProps(override, custom, storeId)

  let modelProps = {};
  if (custom && custom.length) {
    let [,id, keyFn, valueFn, valueProp, keyProp] = custom as CustomModel<E>;
    modelProps = {
      [valueProp]: (e: E) => {
        const value = valueFn(e);
        setData(value);
        store.set(id, keyFn({ ...element.props, ...overrideProps }), value);
      },
      [keyProp]: data
    }
  }

  return cloneElement(element, {
    ...overrideProps, ...modelProps
    
  }, children);
}

export function GenRateOverride<E, D>(props: OverrideProps<E,D>) {

  const { element, children, override, custom, storeId } = props;
  let overrideProps = useOverrideProps(override, custom, storeId);

  if (custom && custom.length) {
    const [type, ] = custom;
    if (type == 'render') {
      const [,node] = custom as CustomRender<D>;
      return createElement(node.type, { ...overrideProps, gnode: element })
    }
  }

  return cloneElement(element, overrideProps, children)
}