import { ReactElement } from 'react';
import { CustomOverride, KeyValue, ModelValueFn, OverrideFn } from './override';
import { ElementType } from './override/component';

interface StoreMap {
  [key: string]: KeyValue;
}

export interface OverrideModel {
  id: string;
  key: string;
  prop?: {
    element: ReactElement;
    key: string;
  };
  valueFn: ModelValueFn;
  keyProp: string;
  valueProp: string;
}

export interface OverrideData {
  node: {
    type: ElementType;
    props: KeyValue;
  };
  children: ReactElement;
  override: OverrideFn[];
  custom: CustomOverride;
  model?: OverrideModel;
}

interface StoreOverride {
  [key: string]: OverrideData;
}

interface StoreOverrideMap {
  [key: string]: StoreOverride;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listener = (value: any) => void;

export interface Subscription {
  listener: Listener;
  unsubscribed: () => void;
}

interface StoreEvent {
  [key: string]: Subscription[];
}

interface StoreEventMap {
  [key: string]: StoreEvent;
}

export const store = {
  data: {} as StoreMap,

  init<D = KeyValue>(id: string, props: D) {
    if (!this.data[id] || (props && Object.keys(props).length)) {
      let initial = this.data[id] || {};
      for (const k in props) {
        initial = { ...initial, [k]: props[k] };
      }

      this.data[id] = { ...initial };
    }
  },

  proxy(id: string, cb?: (prop: string) => void) {
    return new Proxy(this.data[id], {
      get: (_t, prop: string) => {
        cb?.(prop);
        return this.data[id][prop] || null;
      },
    });
  },

  get(id: string, key: string) {
    return this.data[id][key] || null;
  },

  set(id: string, key: keyof KeyValue, value: KeyValue[typeof key]) {
    if (!Object.prototype.hasOwnProperty.call(this.data[id], key)) {
      this.emit(id, ':new-key', key);
    }

    this.data[id][key] = value;
    this.emit(id, key as string, value);
  },
  del(id: string) {
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
    return this.override[id]?.[key];
  },

  events: {} as StoreEventMap,
  subscribe(id: string, event: string, listener: Listener) {
    if (!this.events[id]) this.events[id] = {};
    if (!this.events[id][event]) this.events[id][event] = [];

    const subscriptions = this.events[id][event];

    const subscription = {
      listener,
      unsubscribed() {
        const pos = subscriptions.indexOf(this);
        if (pos != -1) {
          subscriptions.splice(pos, 1);
        }
      },
    };

    this.events[id][event].push(subscription);
    return subscription;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(id: string, event: string, data: any) {
    if (this.events[id]?.[event]) {
      for (const subscription of this.events[id][event]) {
        subscription.listener(data);
      }
    }
  },
};
