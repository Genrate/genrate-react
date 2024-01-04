import React, { ChangeEvent, JSXElementConstructor, useState } from 'react';
import { CustomAttach, CustomQuery, KeyValue, Queries } from '.';
import { useGenRate } from '../hooks/useGenRate';
import { useOverrideProps } from '../hooks/useOverrideProps';
import { OverrideData, store } from '../store';

export type ElementType = string | JSXElementConstructor<KeyValue> | ((p: KeyValue) => JSX.Element);

interface OverrideProps {
  id: string;
  storeId: string;
  key: string;
}

export const GenRateModel = React.memo((props: OverrideProps) => {
  const { storeId, id } = props;
  const { node, override, custom, model, children } = store.override[storeId][id];

  const [data, setData] = useState<string | number | boolean>('');
  const [overrideProps] = useOverrideProps(override, custom, storeId);

  let modelProps = {};
  if (model?.key) {
    const { key, valueFn, keyProp, valueProp } = model;
    const storeKey = model.prop ? model.prop.key : key;

    modelProps = {
      [keyProp]: (e: ChangeEvent) => {
        const value = valueFn(e);
        setData(value);
        store.set(storeId, storeKey, value);
      },
      [valueProp]: data,
    };
  }

  if (model?.prop?.element) {
    const PComponent = model.prop.element.type;
    const PProps = { ...model.prop.element.props, ...modelProps };

    modelProps = { [model.key]: <PComponent {...PProps} /> };
  }

  const EComponent = node.type;
  const EProps = { ...node.props, ...overrideProps, ...modelProps };

  return <EComponent {...EProps}>{children}</EComponent>;
});

interface GenRateQueryProps {
  node: (p: KeyValue) => JSX.Element;
  queries: Queries<KeyValue>;
  data: KeyValue;
  storeId: string;
}

export const GenRateQuery = React.memo((props: GenRateQueryProps) => {
  const { node, queries, data, storeId } = props;
  const { view } = useGenRate(data, storeId);
  return view(node, queries);
});

export const GenRateOverride = React.memo((props: OverrideProps) => {
  const { storeId, id } = props;
  const { node, override, custom, children } = store.getOverride(storeId, id);

  const [overrideProps, overrideItems] = useOverrideProps(override, custom, storeId);

  const EComponent = node.type;

  const EProps: KeyValue = { ...node.props, ...overrideProps };

  const proxy = new Proxy(EProps, {
    get(target, p: string) {
      return target?.[p] || null;
    },
  });

  let queries: Queries<KeyValue> | undefined = undefined;
  let queryStoreId: string = '';
  if (custom && custom.length) {
    const [type] = custom;
    if (type == 'attach') {
      const [, , componentFn] = custom as CustomAttach;
      if (typeof componentFn == 'function') {
        return componentFn(proxy);
      } else {
        console.warn('Invalid attach component', componentFn);
      }
    } else if (type == 'query') {
      [, queryStoreId, queries] = custom;
    }
  }

  if (queries) {
    const QProps = {
      node: EComponent as (p: KeyValue) => JSX.Element,
      queries,
      data: proxy,
      storeId: queryStoreId,
    };

    return <GenRateQuery {...QProps} />;
  }

  if (overrideItems?.length) {
    const components = [];
    let i = 0;
    for (const item of overrideItems) {
      if (Array.isArray(item)) {
        const data: OverrideData = {
          node: {
            type: node.type,
            props: node.props,
          },
          children,
          override: [],
          custom: item as CustomAttach | CustomQuery,
        };

        const overrideId = `${id}-${i}`;
        store.setOverride(storeId, overrideId, data);

        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        components.push(genrate({ key: overrideId, id: overrideId, storeId }, false));
      } else {
        components.push(
          <EComponent key={`${id}-${i}`} id={`${id}-${i}`} {...EProps} {...item}>
            {children}
          </EComponent>
        );
      }
      i++;
    }

    return components;
  }

  if (typeof EComponent == 'function') {
    return (EComponent as (p: KeyValue) => JSX.Element)(proxy);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <EComponent {...(EProps as any)}>{children}</EComponent>;
});

export function genrate(props: OverrideProps, isModel: boolean) {
  return isModel ? <GenRateModel {...props} /> : <GenRateOverride {...props} />;
}

export function rebuild(Component: JSXElementConstructor<KeyValue>, props: KeyValue, children: React.ReactElement) {
  return <Component {...props}>{children}</Component>;
}
