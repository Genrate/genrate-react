import { KeyValue } from '../override';

interface StoreMap {
  [key: string]: KeyValue;
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
