import React, { ChangeEvent, JSXElementConstructor, useState } from 'react';
import { CustomAttach, CustomModel, CustomOverride, CustomQuery, KeyValue, Queries, get_override_model } from '.';
import { useConnector } from '../hooks/useConnector';
import { useOverrideProps } from '../hooks/useOverrideProps';
import { OverrideData, store } from '../store';
import { get_value } from '../utils';
import md5 from 'md5';

export type ElementType = string | JSXElementConstructor<KeyValue> | ((p: KeyValue) => JSX.Element);

interface OverrideProps {
  id: string;
  storeId: string;
  key: string;
}

interface GenRateQueryProps {
  node: (p: KeyValue) => JSX.Element;
  queries: Queries<KeyValue>;
  data: KeyValue;
  storeId: string;
}

export const GenRateQuery = React.memo((props: GenRateQueryProps) => {
  const { node, queries, data, storeId } = props;
  const { view } = useConnector(data, storeId);
  return view(node, queries);
});

export const GenRateOverride = React.memo((props: OverrideProps) => {
  const { storeId, id } = props;
  const overrideData = store.getOverride(storeId, id);
  const { node, override, custom, children } = overrideData;

  const [modelData, setModelData] = useState<string | number | boolean>('');

  const [overrideProps, overrideItems, overrideCustom] = useOverrideProps(override, custom, storeId);

  let { model } = overrideData;
  if (!model && overrideCustom.model?.length) {
    model = get_override_model({ ...node.props, ...overrideProps }, overrideCustom.model);
  }

  let modelProps = {};
  if (model?.key) {
    const { key, valueFn, keyProp, valueProp } = model;
    const storeKey = model.prop ? model.prop.key : key;

    modelProps = {
      name: storeKey,
      [keyProp]: (e: ChangeEvent) => {
        const value = valueFn(e);
        setModelData(value);

        if (storeKey.indexOf('.') > -1) {
          const keys: string[] = storeKey.split('.');
          const mainKey: string = keys.shift() as string;
          const oldValue = store.get(storeId, mainKey);
          const newValue = get_value(oldValue, keys, value);
          store.set(storeId, mainKey, newValue);
        } else {
          store.set(storeId, storeKey, value);
        }
      },
      [valueProp]: modelData,
    };
  }

  if (model?.prop?.element) {
    const PComponent = model.prop.element.type;
    const PProps = { ...model.prop.element.props, ...modelProps };

    modelProps = { [model.key]: <PComponent {...PProps} /> };
  }

  const EComponent = node.type;

  const EProps: KeyValue = { ...node.props, ...overrideProps, ...modelProps };

  const proxy = new Proxy(EProps, {
    get(target, p: string) {
      return target?.[p] || null;
    },
  });

  const customMain = custom.main ?? overrideCustom.main;

  let queries: Queries<KeyValue> | undefined = undefined;
  let queryStoreId: string = '';
  if (customMain?.length) {
    const [type] = customMain;
    if (type == 'attach') {
      const [, , componentFn] = customMain;
      if (typeof componentFn == 'function') {
        return componentFn(proxy);
      } else {
        console.warn('Invalid attach component', componentFn);
      }
    } else if (type == 'query') {
      [, queryStoreId, queries] = customMain;
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
      if (item == false) continue;

      if (Array.isArray(item)) {
        const co: CustomOverride = {};

        if (['attach', 'query'].indexOf(item[0]) > -1) {
          co.main = item as CustomAttach | CustomQuery;
        } else if (item[0] == 'model') {
          co.model = item as CustomModel;
        } else {
          console.warn(`An '${item[0]}' override is now allowed inside 'each' override, iteration will be ignored`);
          continue;
        }

        const data: OverrideData = {
          node: {
            type: node.type,
            props: node.props,
          },
          children,
          override: [],
          custom: co,
        };

        const model = co.model ? get_override_model(node.props, co.model) : null;

        if (model) data.model = model;

        const overrideId = `${id}-${md5(`${i}${model?.id}`)}`;
        store.setOverride(storeId, overrideId, data);

        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        components.push(genrate({ key: overrideId, id: overrideId, storeId }));
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

export function genrate(props: OverrideProps) {
  return <GenRateOverride {...props} />;
}

export function rebuild(Component: JSXElementConstructor<KeyValue>, props: KeyValue, children: React.ReactElement) {
  return <Component {...props}>{children}</Component>;
}
