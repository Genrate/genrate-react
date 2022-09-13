import { ChangeEvent, isValidElement, JSXElementConstructor, ReactElement, ReactNode } from "react";
import { get_tag_name, Node } from "../utils";
import { ElementType, genrate, rebuild } from "./component";
import { matcher } from "./selector";
import { OverrideData, OverrideModel, store } from "../store";

import md5 from 'md5';

type Matcher = ReturnType<typeof matcher>;

type KeyValue = { [key: string]: any };

export type OverrideFn<D = KeyValue> = (data: D) => KeyValue;

export type ModelKey = string | [string, ModelKeyFn]
export type ModelKeyFn = ((p: KeyValue) => string)
export type ModelValueFn<E = ChangeEvent<HTMLInputElement>> = (e: E) => string | number | boolean;
type DataKeyFn = string[] | ((data: KeyValue) => KeyValue)

export type CustomModel = ['model', string, [string, ModelKeyFn] | ModelKeyFn, ModelValueFn, string, string]
export type CustomPass = ['pass', string[] | true, string[]]
export type CustomAttach = ['attach', (props: any) => ReactElement, DataKeyFn]

export type Custom = CustomModel | CustomPass | CustomAttach

type Override<D = KeyValue> = OverrideFn<D> | ReactNode | Custom

export interface Overrides<D> {
  [key: string]: Override<D>
}

type MapElementCB = (overrides: string[]) => [ReactNode, OverrideFn[], Custom | [], string]


function get_override_model(node: ReactElement, custom: CustomModel) {
  let model: OverrideModel = { 
    id: '', 
    key: '', 
    valueFn: custom[3], 
    valueProp: custom[4], 
    keyProp: custom[5] 
  }

  const keyFn = custom[2];

  if (!Array.isArray(keyFn)) { 
    model.key = keyFn({ ...node.props });
    model.id = model.key;
  } else {
    let propKey;
    [model.key, propKey] = keyFn

    if (isValidElement(node.props[model.key])) {
      model.prop = {
        element: node.props[model.key],
        key: typeof propKey == 'function' 
          ? propKey(node.props[model.key].props) 
          : propKey
      }

      model.id = model.prop.key;
    }
  }

  return model;
}

function map_element(node: ReactNode, matcher: Matcher, cb: MapElementCB, index: string = '0'): ReactNode {
  
  if (Array.isArray(node)) {
    return node.map(
      (n: ReactNode, i: number) => map_element(n, matcher, cb, `${index}[${i}]`)
    );
  }

  const tag = get_tag_name(node as Node)

  let result = tag ? matcher.match(tag, (node as ReactElement).props) : [];

  const [overrideNode, overrideFns, custom, storeId] = cb(result);

  if (node && isValidElement(node)) {

    let children = undefined;

    if (!overrideNode && node.props && node.props.children) {

      if (Array.isArray(node.props.children)) {
        children = node.props.children.map(
          (child: ReactNode, i: number) => map_element(child, matcher.next(), cb, `${index}-${i}`)
        ).filter((c: ReactNode) => c != null)
      } else {
        children = map_element(node.props.children, matcher.next(), cb, `${index}-0`);
      }
    }
    
    if (Object.keys(overrideFns).length || custom.length) {

      const data: OverrideData = {
        node: {
          type: node.type,
          props: node.props, 
        },
        children, 
        override: overrideFns, 
        custom,
      }

      const isModel = (custom.length && custom[0] == 'model') || false;
      let model = isModel ? get_override_model(node, custom as CustomModel) : null;

      if (model) data.model = model;

      const overrideId = md5(`${result.join('|')}${model && model.id}`);
      store.setOverride(storeId, overrideId, data);      

      return genrate({ key: index, id: overrideId, storeId }, isModel)
    } else if (children != node.props.children) {
      return rebuild(
        node.type as JSXElementConstructor<any>, 
        { ...node.props, key: index }, 
        children
      )
    }
  }

  return node;
} 

function apply_overrides(overrides: Override[], id: string): [ReactNode, OverrideFn[], Custom | [], string] {

  let node: ReactNode = null;
  let functions: OverrideFn[] = [];
  let custom: Custom | [] = [];
  if (overrides && overrides.length) {

    for (const override of overrides) {
      if (override === false) {
        return [null, [], [], id]
      }

      if (isValidElement(override)) {
        node = override;
      }

      if (typeof override == 'function') {
        functions = [ ...functions, override]
        continue;
      }

      if (Array.isArray(override)) {
        custom = override;
        continue
      }
    }
  }

  return [node, functions, custom, id];
} 


export function override(node: ReactNode, overrides: Overrides<KeyValue>, id: string) {
  let selectors = Object.keys(overrides);
  return map_element(
    node, 
    matcher(selectors), 
    (o) => apply_overrides(o.map((m: string) => overrides[m]), id)
  );
}