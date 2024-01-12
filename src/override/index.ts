import { ChangeEvent, isValidElement, JSXElementConstructor, ReactElement, ReactNode } from 'react';
import { get_tag_name, Node } from '../utils';
import { genrate, rebuild } from './component';
import { matcher } from './selector';
import { OverrideData, OverrideModel, store } from '../store';

import md5 from 'md5';

type Matcher = ReturnType<typeof matcher>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type KeyValue = { [key: string]: any };

export type OverrideFn<D = KeyValue> = (data: D) => KeyValue | CustomModel | CustomAttach | CustomQuery | CustomEach;

export type ModelKey = string | [string, ModelKeyFn?];
export type ModelKeyFn = (p: KeyValue) => string;
export type ModelValueFn<E = ChangeEvent> = (e: E) => string | number | boolean;
type DataKeyFn = string[] | ((data: KeyValue) => KeyValue);

export type CustomModel = ['model', string, [string, ModelKeyFn] | ModelKeyFn, ModelValueFn, string, string];
export type CustomPass = ['pass', string, string[] | true, string[]];
export type CustomAttach = ['attach', string, (props: KeyValue) => ReactElement, DataKeyFn];
export type CustomQuery = ['query', string, Queries<KeyValue>];
export type CustomEach<D = KeyValue> = [
  'each',
  string,
  (data: D) => Array<false | KeyValue | CustomModel | CustomQuery | CustomAttach>,
];

export type Custom = CustomModel | CustomPass | CustomAttach | CustomQuery | CustomEach;

export type CustomOverride = {
  main?: CustomAttach | CustomQuery | CustomEach;
  model?: CustomModel;
  passes?: CustomPass[];
};

type Override<D = KeyValue> = OverrideFn<D> | ReactNode | Custom;

export interface Queries<D> {
  [key: string]: Override<D>;
}

type MapElementCB = (
  overrides: string[],
  tag: string | undefined,
  props: KeyValue
) => [ReactElement | null | false, OverrideFn[], CustomOverride, string];

export function get_override_model(props: KeyValue, custom: CustomModel) {
  const model: OverrideModel = {
    id: '',
    key: '',
    valueFn: custom[3],
    valueProp: custom[4],
    keyProp: custom[5],
  };

  const keyFn = custom[2];

  if (!Array.isArray(keyFn)) {
    model.key = keyFn({ ...props });
    model.id = model.key;
  } else {
    let propKey;
    [model.key, propKey] = keyFn;

    if (isValidElement(props[model.key])) {
      model.prop = {
        element: props[model.key],
        key: typeof propKey == 'function' ? propKey(props[model.key].props) : propKey,
      };

      model.id = model.prop.key;
    }
  }

  return model;
}

function map_element(node: ReactNode, matcher: Matcher, cb: MapElementCB, index = '0'): ReactNode {
  if (Array.isArray(node)) {
    return node.map((n: ReactNode, i: number) => map_element(n, matcher, cb, `${index}[${i}]`));
  }

  const tag = get_tag_name(node as Node);

  const MProps = tag ? { ...(node as ReactElement).props, key: (node as ReactElement).key } : {};

  const result = tag ? matcher.match(tag, MProps) : [];

  const [overrideNode, overrideFns, custom, storeId] = cb(result, tag, (node as ReactElement).props);

  if (overrideNode === false) {
    return null;
  }

  if (node && isValidElement(node)) {
    let children = undefined;

    if (!overrideNode && node.props?.children) {
      if (Array.isArray(node.props.children)) {
        children = node.props.children
          .map((child: ReactNode, i: number) => map_element(child, matcher.next(), cb, `${index}-${i}`))
          .filter((c: ReactNode) => c != null);
      } else {
        children = map_element(node.props.children, matcher.next(), cb, `${index}-0`);
      }
    }

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    if (overrideNode || Object.keys(overrideFns).length || custom.main || custom.model || custom.passes?.length) {
      const data: OverrideData = {
        node: {
          type: (overrideNode ?? node).type,
          props: (overrideNode ?? node).props,
        },
        children,
        override: overrideFns,
        custom,
      };

      const model = custom.model ? get_override_model((overrideNode ?? node).props, custom.model) : null;

      if (model) data.model = model;

      const overrideId = md5(`${result.join('|')}${model?.id}`);
      store.setOverride(storeId, overrideId, data);
      return genrate({ key: index, id: overrideId, storeId });
    } else if (children != node.props.children) {
      return rebuild(node.type as JSXElementConstructor<KeyValue>, { ...node.props, key: index }, children);
    }
  }

  return node;
}

function apply_overrides(overrides: Override[], tag: string, props: KeyValue, id: string): ReturnType<MapElementCB> {
  let node: ReactElement | null = null;
  let functions: OverrideFn[] = [];
  const customs: CustomOverride = { passes: [] };
  if (overrides?.length) {
    for (const override of overrides) {
      if (override === false) {
        return [false, [], {}, id];
      }

      if (isValidElement(override)) {
        node = override;
      }

      if (typeof override == 'function') {
        functions = [...functions, override];
        continue;
      }

      if ((override as CustomPass)?.[0] == 'pass') {
        customs.passes?.push(override as CustomPass);
        continue;
      }

      if (Array.isArray(override)) {
        const [type] = override;

        if (['attach', 'query', 'each'].indexOf(type) > -1) {
          if (!customs.main?.length) {
            customs.main = override as CustomAttach | CustomQuery | CustomEach;
          } else {
            const attrs = Object.keys(props)
              .map((k) => `${k}="${props[k]}"`)
              .join(' ');
            console.warn(
              `An '${customs.main[0]}' override is already applied, '${type}' override will be ignore to element <${tag} ${attrs}/>`
            );
          }
        } else if (type == 'model') {
          if (customs?.main?.[0] == 'each') {
            const attrs = Object.keys(props)
              .map((k) => `${k}="${props[k]}"`)
              .join(' ');
            console.warn(
              `An 'each' override is already applied, '${type}' override will be ignore to element <${tag} ${attrs}/>`
            );
          } else {
            customs.model = override;
          }
        }
      }
    }
  }

  return [node, functions, customs, id];
}

export function override(node: ReactNode, overrides: Queries<KeyValue>, id: string) {
  const selectors = Object.keys(overrides);
  return map_element(node, matcher(selectors), (o, tag, props) =>
    apply_overrides(
      o.map((m: string) => overrides[m]),
      tag ?? '',
      props,
      id
    )
  );
}
