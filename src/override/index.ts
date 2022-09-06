import { ChangeEvent, cloneElement, createElement, isValidElement, ReactElement, ReactNode } from "react";
import { get_tag_name, Node } from "../utils";
import { GenRateModel, GenRateOverride } from "./component";
import { matcher } from "./selector";

type Matcher = ReturnType<typeof matcher>;

type KeyValue = { [key: string]: any };

export type OverrideFn<D> = (data: D) => KeyValue;

type KeyFn = ((p: { [key: string]: any }) => string)
type ValueFn<E> = (e: E) => string | number | boolean;
type DataKeyFn<D> = (keyof D)[] | ((data: D) => KeyValue)

export type CustomModel<E> = ['model', string, KeyFn, ValueFn<E>, string, string]
export type CustomPass = ['pass', string[]]
export type CustomRender<D> = ['render', ReactElement, DataKeyFn<D>]

export type Custom<E,D> = CustomModel<E> | CustomPass | CustomRender<D>

type Override<E, D> = OverrideFn<D> | ReactNode | Custom<E, D>

export interface Overrides<E, D> {
  [key: string]: Override<E, D>
}

type MapElementCB<E, D> = (overrides: string[]) => [ReactNode, OverrideFn<D>[], Custom<E, D> | [], string]

function map_element<E, D>(node: ReactNode, matcher: Matcher, cb: MapElementCB<E, D>, index: string = '0'): ReactNode {
  
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

      const props = {
        key: index, 
        override: overrideFns, 
        custom, storeId,
        element: (overrideNode || node) as ReactElement, 
        children 
      }

      if (custom.length && custom[0] == 'model') {
        return createElement(GenRateModel<E,D>, props)
      }

      return createElement(GenRateOverride<E,D>, props)
    } else if (children != node.props.children) {
      return cloneElement(node, { key: index }, children)
    }
  }

  return node;
} 

function apply_overrides<E, D>(overrides: Override<E, D>[], id: string): [ReactNode, OverrideFn<D>[], Custom<E,D> | [], string] {

  let node: ReactNode = null;
  let functions: OverrideFn<D>[] = [];
  let custom: Custom<E,D> | [] = [];
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


export function override<E,D>(node: ReactNode, overrides: Overrides<E, D>, id: string) {
  
  return map_element(node, matcher(Object.keys(overrides)), 
    (o) => apply_overrides(o.map((m: string) => overrides[m]), id)
  );
}