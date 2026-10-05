import { useCallback, useState } from 'react';

import { readStorage, writeStorage } from '../utils/storage';

export type StorageCodec<T> = {
  /** Turns the stored string (or `null` when nothing is stored) into a value. */
  parse(raw: string | null): T;
  serialize(value: T): string;
};

export const booleanCodec: StorageCodec<boolean> = {
  parse: (raw) => raw === 'true',
  serialize: String,
};

/** `useState` that is read from and written to localStorage under `key`. */
export function usePersistentState<T>(
  key: string,
  codec: StorageCodec<T>,
): [T, (next: T) => void] {
  const [value, setValue] = useState(() => codec.parse(readStorage(key)));

  const update = useCallback(
    (next: T) => {
      setValue(next);
      writeStorage(key, codec.serialize(next));
    },
    [key, codec],
  );

  return [value, update];
}
