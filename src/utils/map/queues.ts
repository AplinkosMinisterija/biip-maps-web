export class Queues {
  protected _queue: any[] = [];

  protected _addToQueue(action: string, ...data: any[]) {
    this._queue.push({ action, data });
    return this;
  }

  protected _processQueue(): any {
    if (!this._queue?.length) return;

    const action = this._queue.shift();
    (this as any)[action.action].apply(this, action.data);

    return this._processQueue();
  }
}
