import { cloneElement, createElement, isValidElement, ReactElement, ReactNode, useState } from "react";
import { Custom, CustomModel, CustomAttach, OverrideFn, ModelKeyFn } from ".";
import { useOverrideProps } from "../hooks/useOverrideProps";
import { store } from "../store";

interface OverrideProps { 
  element: ReactElement, 
  children: ReactElement, 
  override: OverrideFn[], 
  storeId: string, 
  custom: Custom | [],
}

export function GenRateModel(props: OverrideProps) {
  const { element, override, custom, storeId, children } = props;

  const [data, setData] = useState<string | number | boolean>('');
  const overrideProps = useOverrideProps(override, custom, storeId)

  let modelProps = {}, propModel, propKey: string | ModelKeyFn, propElement: ReactNode = null;
  if (custom && custom.length) {
    let [,id, keyFn, valueFn, valueProp, keyProp] = custom as CustomModel;

    let key: string;
    if (!Array.isArray(keyFn)) { 
      key = keyFn({ ...element.props, ...overrideProps });
    } else {
      [propModel, propKey] = keyFn
      propElement = element.props[propModel] as ReactElement;
      key = typeof propKey == 'function' ? propKey(propElement.props) : propKey
    }

    modelProps = {
      [keyProp]: (e: any) => {
        const value = valueFn(e);
        setData(value);
        store.set(id, key as string, value);
      },
      [valueProp]: data
    }
  }

  if (propModel) {
    
    if (isValidElement(propElement)) {

      return cloneElement(element, {
        ...overrideProps, ...{
          [propModel]: cloneElement(propElement, { 
            ...(propElement.props || {}),
            ...modelProps 
          }, propElement.props && (propElement.props as any).children)
        }
      }, children)

    }

    modelProps = {};
  }  

  return cloneElement(element, {
    ...overrideProps, 
    ...modelProps
  }, children);
}

export function GenRateOverride(props: OverrideProps) {

  const { element, children, override, custom, storeId } = props;
  let overrideProps = useOverrideProps(override, custom, storeId);

  if (custom && custom.length) {
    const [type, ] = custom;
    if (type == 'attach') {
      const [,node] = custom as CustomAttach;
      return createElement(node.type, { ...overrideProps, gnode: element })
    }
  }

  return cloneElement(element, overrideProps, children)
}