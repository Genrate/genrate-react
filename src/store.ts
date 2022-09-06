interface StoreData {
  [key: string]: any
}

interface StoreMap {
  [key: string]: StoreData
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

  proxy(id: string, cb?: (prop: string) => void) {

    let handle = {
      get: (_t: any, prop: string) => {
        cb && cb(prop)
        return this.data[id][prop]
      },
    }

    return new Proxy(this.data[id], handle as any)
  },

  set (id: string, key: string, value: any) {
    this.data[id][key] = value;
    this.emit(id, key, value);
  },
  del (id: string) {
    delete this.data[id];
    delete this.events[id];
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