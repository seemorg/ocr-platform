type Events = {
  JOIN: {};
};

export type EventName = keyof Events & string;
export type EventPayload<T extends EventName> = Events[T];
export type EventBody<T extends EventName> = {
  type: T;
  payload: EventPayload<T>;
};

export type AnyEvent = {
  [K in EventName]: EventBody<K>;
}[EventName];

export const makeEventBody = <T extends EventName>(
  type: T,
  payload: EventPayload<T>,
): EventBody<T> => ({
  type,
  payload,
});

const makeStringEventBody = <T extends EventName>(
  type: T,
  payload: EventPayload<T>,
): string => JSON.stringify(makeEventBody(type, payload));

makeEventBody.stringify = makeStringEventBody;
