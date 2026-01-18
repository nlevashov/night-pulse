// expo-secure-store mock
const storage: Record<string, string> = {};

export const getItemAsync = jest.fn(async (key: string) => storage[key] ?? null);

export const setItemAsync = jest.fn(async (key: string, value: string) => {
  storage[key] = value;
});

export const deleteItemAsync = jest.fn(async (key: string) => {
  delete storage[key];
});

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
