import React, { ChangeEvent, JSXElementConstructor } from 'react';
import { CustomAttach, CustomModel, CustomOverride, CustomQuery, KeyValue, Queries } from '.';
import { useConnectorCore } from '../hooks/useConnector';
import { useOverrideProps } from '../hooks/useOverrideProps';
import md5 from 'md5';
import { Override, OverrideData } from './override';

export type ElementType = string | JSXElementConstructor<KeyValue> | ((p: KeyValue) => JSX.Element);

interface OverrideProps {
  id: string;
  connectorId: string;
  key: string;
}

interface GenRateQueryProps {
  node: (p: KeyValue) => JSX.Element;
  queries: Queries<KeyValue>;
  data: KeyValue;
  connectorId: string;
}

export const GenRateQuery = React.memo((props: GenRateQueryProps) => {
  const { node, queries, data, connectorId } = props;
  const { view } = useConnectorCore(data, connectorId);
  return view(node, queries);
});

export const GenRateOverride = React.memo((props: OverrideProps) => {
  const { connectorId, id } = props;
  const store = Override.getStore();
  const overrideData = Override.get(connectorId, id);
  const { node, override, custom, children } = overrideData;

  const [overrideProps, overrideItems, overrideCustom] = useOverrideProps(override, custom, connectorId);

  let { model } = overrideData;
  if (!model && overrideCustom.model?.length) {
    model = Override.getModel({ ...node.props, ...overrideProps }, overrideCustom.model);
  }

  let modelProps = {};
  const modelKey = model?.prop?.key ?? model?.key;

  const [modelData, setModelData] = store.useModel(connectorId, modelKey);

  if (model && modelKey) {
    const { valueFn, keyProp, valueProp } = model;
    modelProps = {
      name: modelKey,
      [keyProp]: (e: ChangeEvent) => setModelData(valueFn(e)),
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
      connectorId: queryStoreId,
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

        const model = co.model ? Override.getModel(node.props, co.model) : null;

        if (model) data.model = model;

        const overrideId = `${id}-${md5(`${i}${model?.id}`)}`;
        Override.set(connectorId, overrideId, data);

        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        components.push(genrate({ key: overrideId, id: overrideId, connectorId }));
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

export function rebuild(Component: JSXElementConstructor<KeyValue>, props: KeyValue, children?: React.ReactElement) {
  return <Component {...props}>{children}</Component>;
}
