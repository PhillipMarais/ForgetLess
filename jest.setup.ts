// expo-crypto is a native module; Node's implementation gives tests real, unique UUIDs.
jest.mock('expo-crypto', () => ({
  randomUUID: () => require('node:crypto').randomUUID(),
}));

// Reanimated, Worklets and Gesture Handler need native code; tests use their JS stand-ins.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const value = (initial: unknown) => {
    let current = initial;
    return { get: () => current, set: (next: unknown) => (current = next), value: initial };
  };
  const animation = { duration: () => animation, delay: () => animation };
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (component: unknown) => component },
    useSharedValue: value,
    isSharedValue: () => false,
    useAnimatedStyle: (style: () => object) => style(),
    withTiming: (to: unknown) => to,
    withSpring: (to: unknown) => to,
    FadeInLeft: animation,
    FadeInRight: animation,
    LinearTransition: animation,
  };
});
jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn: (...args: unknown[]) => void, ...args: unknown[]) => fn(...args),
}));
require('react-native-gesture-handler/jestSetup');
