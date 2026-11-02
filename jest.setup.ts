// expo-crypto is a native module; Node's implementation gives tests real, unique UUIDs.
jest.mock('expo-crypto', () => ({
  randomUUID: () => require('node:crypto').randomUUID(),
}));
