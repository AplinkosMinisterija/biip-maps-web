import _ from 'lodash';

class EventListener {
  _messageListeners: { [key: string]: Function[] } = {};
  _messageListenerAll: Function | undefined;
  _queue: any[] = [];
  _loading: boolean = false;

  constructor() {
    const that = this;
    window.addEventListener('message', (event) => {
      if (!event.data) return;

      let eventData = event.data;
      if (typeof event.data === 'string') {
        eventData = JSON.parse(eventData);
      }

      // filter messages
      if (
        !eventData ||
        eventData?.type === 'webpackOk' ||
        typeof eventData?.vueDetected !== 'undefined'
      ) {
        return;
      }

      if (that._loading) {
        this._queue.push(eventData);
        return;
      }

      that._listener(eventData);
    });
  }

  on(event: string, callback: Function) {
    if (typeof callback !== 'function') {
      throw new Error('Callback is not a function!');
    }

    this._messageListeners[event] = this._messageListeners[event] || [];
    this._messageListeners[event].push(callback);

    return this;
  }

  setLoading(value: boolean = false) {
    this._loading = !!value;

    if (!value) {
      this._processQueue();
    }
  }

  onAll(callback: Function) {
    if (typeof callback !== 'function') {
      throw new Error('Callback is not a function!');
    }

    this._messageListenerAll = callback;

    return this;
  }

  _listener(eventData: any) {
    if (this._messageListenerAll && typeof this._messageListenerAll === 'function') {
      this._messageListenerAll(eventData);
    }

    const name = eventData?.name || eventData?.eventName;

    if (!name && _.isObject(eventData)) {
      Object.entries(eventData).forEach(([key, value]: any[]) => {
        this._listener({ name: key, _data: value });
      });
      return;
    }

    if (name && this._messageListeners[name]) {
      this._messageListeners[name].forEach((cb) => {
        if (eventData._data) {
          return cb(eventData._data);
        }
        return cb(eventData);
      });
    }
  }

  destroy() {
    // window.removeEventListener("message");
  }

  _processQueue() {
    this._queue.forEach((item) => this._listener(item));
  }
}

const postMessage = (key: string, data: any) => {
  data = { mapIframeMsg: { [key]: data } };

  if ((window as any).ReactNativeWebView) {
    (window as any).ReactNativeWebView.postMessage(JSON.stringify(data));
  } else if (window.parent && window.parent != window) {
    window.parent.postMessage(data, '*');
  }
};

const listener = new EventListener();
listener.setLoading(true);
export default {
  install(app: any) {
    app.provide('events', listener);
    app.provide('postMessage', postMessage);
  },
};
