// @react-native-async-storage/async-storage mock
const storage: Record<string, string> = {};

export const getItem = jest.fn(async (key: string) => storage[key] ?? null);

export const setItem = jest.fn(async (key: string, value: string) => {
  storage[key] = value;
});

export const removeItem = jest.fn(async (key: string) => {
  delete storage[key];
});

export const clear = jest.fn(async () => {
  Object.keys(storage).forEach(key => delete storage[key]);
});

export const getAllKeys = jest.fn(async () => Object.keys(storage));

// Helper to reset storage between tests
export const __resetStorage = () => {
  Object.keys(storage).forEach(key => delete storage[key]);
};

// Helper to set storage data
export const __setStorage = (data: Record<string, string>) => {
  Object.keys(storage).forEach(key => delete storage[key]);
  Object.assign(storage, data);
};

// Helper to get storage data
export const __getStorage = () => ({ ...storage });

export default {
  getItem,
  setItem,
  removeItem,
  clear,
  getAllKeys,
  __resetStorage,
  __setStorage,
  __getStorage,
};
