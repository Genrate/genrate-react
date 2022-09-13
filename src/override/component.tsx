import React, { JSXElementConstructor, useState } from "react";
import { CustomAttach } from ".";
import { useOverrideProps } from "../hooks/useOverrideProps";
import { store } from "../store";

export type ElementType = string | JSXElementConstructor<any>

interface OverrideProps { 
  id: string;
  storeId: string, 
  key: string,
}

export const GenRateModel = React.memo((props: OverrideProps) => {
  const { storeId, id } = props;
  const { node, override, custom, model, children } = store.override[storeId][id];

  const [data, setData] = useState<string | number | boolean>('');
  const overrideProps = useOverrideProps(override, custom, storeId)

  let modelProps = {};
  if (model && model.key) {
    let { key, valueFn, keyProp, valueProp  } = model;
    const storeKey = model.prop ? model.prop.key : key

    modelProps = {
      [keyProp]: (e: any) => {
        const value = valueFn(e);
        setData(value);
        store.set(storeId, storeKey, value);
      },
      [valueProp]: data
    }
  }

  if (model && model.prop) {
    if (model.prop.element) {
      const PComponent = model.prop.element.type;
      const PProps = { ...model.prop.element.props, ...modelProps };

      modelProps = { [model.key]: <PComponent {...PProps} /> }
    } else {
      modelProps = {};
    }
  }  
  
  const EComponent = node.type;
  const EProps = { ...node.props, ...overrideProps,  ...modelProps };

  return (
    <EComponent {...EProps}>{children}</EComponent>
  )
})

export const GenRateOverride = React.memo((props: OverrideProps) => {

  const { storeId, id } = props;
  const { node, override, custom, children } = store.getOverride(storeId, id);

  let overrideProps = useOverrideProps(override, custom, storeId);

  const EComponent = node.type;

  let proxy = new Proxy(overrideProps, {
    get(target, p: string) {
      return target && target[p] || null
    },
  })

  if (custom && custom.length) {
    const [type, ] = custom;
    if (type == 'attach') {
      const [,componentFn] = custom as CustomAttach;
      if (typeof componentFn == 'function') {
        return (componentFn as Function)(proxy)
      } else {
        console.warn('Invalid attach component', componentFn)
      }
    }
  }

  if (typeof EComponent == 'function') {
    return (EComponent as Function)(proxy);
  }

  const EProps = { ...node.props, ...overrideProps }

  return (
    <EComponent {...EProps} >{children}</EComponent>
  )
})

export function genrate(props: OverrideProps, isModel: boolean) {
  return isModel 
    ? <GenRateModel {...props} />
    : <GenRateOverride {...props} />
}

export function rebuild(Component: JSXElementConstructor<any>, props: any, children: any) {
  return (
    <Component {...props}>{children}</Component>
  )
}

