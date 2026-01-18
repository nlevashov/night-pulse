// Mock storage for testing

// Storage objects - use object mutation to keep reference
const storage = {
  async: {} as Record<string, string>,
  secure: {} as Record<string, string>,
};

export const mockAsyncStorageModule = {
  getItem: jest.fn(async (key: string) => storage.async[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    storage.async[key] = value;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete storage.async[key];
  }),
  clear: jest.fn(async () => {
    storage.async = {};
  }),
  getAllKeys: jest.fn(async () => Object.keys(storage.async)),
};

export const mockSecureStoreModule = {
  getItemAsync: jest.fn(async (key: string) => storage.secure[key] ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    storage.secure[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete storage.secure[key];
  }),
};

// Helper functions for tests
export function resetMockStorage() {
  // Clear storage by deleting all keys (keep same object reference)
  Object.keys(storage.async).forEach(key => delete storage.async[key]);
  Object.keys(storage.secure).forEach(key => delete storage.secure[key]);
  jest.clearAllMocks();
}

export function setMockAsyncStorage(data: Record<string, string>) {
  // Clear existing and copy new data
  Object.keys(storage.async).forEach(key => delete storage.async[key]);
  Object.assign(storage.async, data);
}

export function setMockSecureStore(data: Record<string, string>) {
  // Clear existing and copy new data
  Object.keys(storage.secure).forEach(key => delete storage.secure[key]);
  Object.assign(storage.secure, data);
}

export function getMockAsyncStorage() {
  return { ...storage.async };
}

export function getMockSecureStore() {
  return { ...storage.secure };
}
