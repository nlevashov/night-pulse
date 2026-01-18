/**
 * Jest Setup File
 * Global mocks for native modules
 */

// Manual mocks are loaded via moduleNameMapper in jest.config.js

// Mock expo-file-system/legacy
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/mock/cache/',
  documentDirectory: '/mock/documents/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  EncodingType: {
    Base64: 'base64',
    UTF8: 'utf8',
  },
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  setNotificationHandler: jest.fn(),
}));

// Mock expo-background-fetch
jest.mock('expo-background-fetch', () => ({
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  getStatusAsync: jest.fn().mockResolvedValue(3),
  BackgroundFetchStatus: {
    Denied: 1,
    Restricted: 2,
    Available: 3,
  },
  BackgroundFetchResult: {
    NoData: 1,
    NewData: 2,
    Failed: 3,
  },
}));

// Mock expo-task-manager
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskDefined: jest.fn().mockReturnValue(true),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(true),
}));

// Mock @shopify/react-native-skia
jest.mock('@shopify/react-native-skia', () => ({
  Skia: {
    Surface: {
      MakeOffscreen: jest.fn().mockReturnValue({
        getCanvas: jest.fn().mockReturnValue({
          drawRRect: jest.fn(),
          drawText: jest.fn(),
          drawLine: jest.fn(),
          drawCircle: jest.fn(),
          drawRect: jest.fn(),
          drawPath: jest.fn(),
        }),
        makeImageSnapshot: jest.fn().mockReturnValue({
          encodeToBase64: jest.fn().mockReturnValue('base64imagedata'),
        }),
      }),
    },
    Paint: jest.fn().mockReturnValue({
      setColor: jest.fn(),
      setStrokeWidth: jest.fn(),
      setStyle: jest.fn(),
      setAntiAlias: jest.fn(),
    }),
    Color: jest.fn().mockReturnValue('#000000'),
    Font: jest.fn().mockReturnValue({
      measureText: jest.fn().mockReturnValue({ width: 100 }),
    }),
    FontMgr: {
      System: jest.fn().mockReturnValue({
        matchFamilyStyle: jest.fn().mockReturnValue({}),
      }),
    },
    RRectXY: jest.fn(),
    XYWHRect: jest.fn(),
    Path: {
      Make: jest.fn().mockReturnValue({
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        close: jest.fn(),
      }),
    },
  },
  PaintStyle: {
    Fill: 0,
    Stroke: 1,
  },
}));

// Mock @kingstinct/react-native-healthkit
jest.mock('@kingstinct/react-native-healthkit', () => ({
  default: {
    isHealthDataAvailable: jest.fn().mockResolvedValue(true),
    requestAuthorization: jest.fn().mockResolvedValue(true),
    getAuthorizationStatus: jest.fn().mockResolvedValue(2),
    querySleepSamples: jest.fn().mockResolvedValue([]),
    queryQuantitySamples: jest.fn().mockResolvedValue([]),
    queryWorkoutSamples: jest.fn().mockResolvedValue([]),
  },
  HKAuthorizationStatus: {
    notDetermined: 0,
    sharingDenied: 1,
    sharingAuthorized: 2,
  },
  HKQuantityTypeIdentifier: {
    heartRate: 'HKQuantityTypeIdentifierHeartRate',
    stepCount: 'HKQuantityTypeIdentifierStepCount',
  },
  HKCategoryTypeIdentifier: {
    sleepAnalysis: 'HKCategoryTypeIdentifierSleepAnalysis',
  },
  HKCategoryValueSleepAnalysis: {
    asleepCore: 3,
    asleepDeep: 4,
    asleepREM: 5,
    awake: 2,
    inBed: 0,
    asleepUnspecified: 1,
  },
}));
