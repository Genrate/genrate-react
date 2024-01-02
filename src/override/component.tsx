import React, { JSXElementConstructor, useState } from "react";
import { CustomAttach, CustomQuery, KeyValue, Queries } from ".";
import { useGenRate } from "../hooks/useGenRate";
import { useOverrideProps } from "../hooks/useOverrideProps";
import { OverrideData, store } from "../store";

export type ElementType = string | JSXElementConstructor<KeyValue> | ((p: KeyValue) => JSX.Element)

interface OverrideProps { 
  id: string;
  storeId: string, 
  key: string,
}

export const GenRateModel = React.memo((props: OverrideProps) => {
  const { storeId, id } = props;
  const { node, override, custom, model, children } = store.override[storeId][id];

  const [data, setData] = useState<string | number | boolean>('');
  const [overrideProps] = useOverrideProps(override, custom, storeId)

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

  if (model && model.prop && model.prop.element) {
    const PComponent = model.prop.element.type;
    const PProps = { ...model.prop.element.props, ...modelProps };

    modelProps = { [model.key]: <PComponent {...PProps} /> }
  }  
  
  const EComponent = node.type;
  const EProps = { ...node.props, ...overrideProps,  ...modelProps };

  return (
    <EComponent {...EProps}>{children}</EComponent>
  )
})

interface GenRateQueryProps { 
  node: (p: KeyValue) => JSX.Element, 
  queries: Queries<KeyValue>, 
  data: KeyValue, 
  storeId: string 
}

export const GenRateQuery = React.memo((props: GenRateQueryProps) => {
  const { node, queries, data, storeId } = props;
  const { view } = useGenRate(data, storeId);
  return view(node, queries)
})

export const GenRateOverride = React.memo((props: OverrideProps) => {

  const { storeId, id } = props;
  const { node, override, custom, children } = store.getOverride(storeId, id);

  let [overrideProps, overrideItems] = useOverrideProps(override, custom, storeId);

  const EComponent = node.type;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const EProps: any = { ...node.props, ...overrideProps }

  let proxy = new Proxy(EProps, {
    get(target, p: string) {
      return target && target[p] || null
    },
  })

  let queries: Queries<KeyValue> | undefined = undefined;
  let queryStoreId: string = '';
  if (custom && custom.length) {
    const [type, ] = custom;
    if (type == 'attach') {
      const [,,componentFn] = custom as CustomAttach;
      if (typeof componentFn == 'function') {
        return (componentFn as Function)(proxy)
      } else {
        console.warn('Invalid attach component', componentFn)
      }
    } else if (type == 'query') {
      [,queryStoreId,queries] = custom;
    }
  }

  if (queries) {
    const QProps = {
      node: EComponent as (p: KeyValue) => JSX.Element, 
      queries, data: proxy, storeId: queryStoreId
    }

    return <GenRateQuery {...QProps} />
  }

  if (overrideItems && overrideItems.length) {
    const components = [];
    let i = 0;
    for (let item of overrideItems) {
      if (Array.isArray(item)) {

        const data: OverrideData = {
          node: {
            type: node.type,
            props: node.props, 
          },
          children, 
          override: [], 
          custom: item as (CustomAttach | CustomQuery),
        }

        const overrideId = `${id}-${i}`;
        store.setOverride(storeId, overrideId, data);      
        components.push(
          genrate({ key: overrideId, id: overrideId, storeId }, false)
        )
      } else {
        components.push(
          <EComponent key={`${id}-${i}`} id={`${id}-${i}`} {...EProps} {...item} >{children}</EComponent>      
        )
      }
      i++;
    }

    return components;
  }

  if (typeof EComponent == 'function') {
    return (EComponent as Function)(proxy);
  }

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

