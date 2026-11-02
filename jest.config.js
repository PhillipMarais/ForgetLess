/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  globalSetup: '<rootDir>/jest.global-setup.js',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/android/', '<rootDir>/ios/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|standard-navigation)',
  ],
  moduleNameMapper: {
    // Web-only global styles; nothing to test in them.
    '\\.css$': '<rootDir>/jest.style-stub.js',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
