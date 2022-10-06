import { ReactElement } from "react"
import { Custom, ModelValueFn, OverrideFn } from "./override"
import { ElementType } from "./override/component"

interface StoreData {
  [key: string]: any
}

interface StoreMap {
  [key: string]: StoreData
}

export interface OverrideModel { 
  id: string,
  key: string,
  prop?: {
    element: ReactElement
    key: string
  },
  valueFn: ModelValueFn,
  keyProp: string;
  valueProp: string;
}

export interface OverrideData {
  node: {
    type: ElementType,
    props: any,
  };
  children: ReactElement;
  override: OverrideFn[]; 
  custom: Custom | [];
  model?: OverrideModel
}

interface StoreOverride {
  [key: string]: OverrideData
}

interface StoreOverrideMap {
  [key: string]: StoreOverride
}

type Listener = (value: any) => void

export interface Subscription { 
  listener: Listener, 
  unsubscribed: () => void
}

interface StoreEvent { 
  [key: string]: Subscription[] 
};

interface StoreEventMap {
  [key: string]: StoreEvent
}

export const store = {
   data: {} as StoreMap,

  init<D = StoreData>(id: string, props: D) {
    if (!this.data[id] || props) {
    
      let initial = this.data[id] || {}
      for (let k in props) {
        if (initial[k] != props[k]) {
          this.emit(id, k, props[k]);
        }

        initial = { ...initial, [k]: (props as any)[k] };
      }
  
      this.data[id] = { ...initial };
    }
  },

  proxy(id: string, cb?: (prop: string) => void) {

    return new Proxy(this.data[id], {
      get: (_t: any, prop: string) => {
        cb && cb(prop)
        return this.data[id][prop] || null
      },
    })
  },

  get(id: string, key: string) {
    return this.data[id][key] || null;
  },

  set (id: string, key: string, value: any) {

    if (!(this.data[id] as Object).hasOwnProperty(key)) {
      this.emit(id, ':new-key', key)
    }

    this.data[id][key] = value;
    this.emit(id, key, value);
  },
  del (id: string) {
    delete this.data[id];
    delete this.events[id];
    delete this.override[id];
  },


  override: {} as StoreOverrideMap,
  setOverride(id: string, key: string, data: OverrideData) {
    if (!this.override[id]) {
      this.override[id] = {};
    }

    this.override[id][key] = data;
  },

  getOverride(id: string, key: string) {
    return this.override[id] && this.override[id][key];
  },

  events: {} as StoreEventMap,
  subscribe(id: string, event: string, listener: Listener) {

    if (!this.events[id]) this.events[id] = {};
    if (!this.events[id][event]) this.events[id][event] = [];

    const subscriptions = this.events[id][event];

    let subscription = { 
      listener,
      unsubscribed() {
        let pos = subscriptions.indexOf(this);
        if (pos != -1) {
          subscriptions.splice(pos, 1);
        }
      }
    };

    this.events[id][event].push(subscription)
    return subscription
  },

  emit(id: string, event: string, data: any) {
    if (this.events[id] && this.events[id][event]) {
      for (let subscription of this.events[id][event]) {
        subscription.listener(data)
      }
    }
  }

}