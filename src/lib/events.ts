type EventHandler = (payload: unknown) => void | Promise<void>;

const handlers = new Map<string, EventHandler[]>();

export function onEvent<T = unknown>(event: string, handler: (payload: T) => void | Promise<void>) {
  const list = handlers.get(event) ?? [];
  list.push(handler as EventHandler);
  handlers.set(event, list);
}

export function emitEvent(event: string, payload: unknown) {
  const list = handlers.get(event) ?? [];
  for (const handler of list) {
    try {
      const res = handler(payload);
      if (res instanceof Promise) {
        res.catch((err) => console.error(`Error in event handler for ${event}:`, err));
      }
    } catch (err) {
      console.error(`Error in event handler for ${event}:`, err);
    }
  }
}
