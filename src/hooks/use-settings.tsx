import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSetting,
  type SettingKey,
  type Settings,
} from '@/db/settings';

type SettingsContextValue = {
  settings: Settings;
  setSetting: <K extends SettingKey>(key: K, value: Settings[K]) => void;
};

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  setSetting: () => {},
});

/** Loads settings once, then keeps them in memory; changes are saved in the background. */
export function SettingsProvider({ children }: PropsWithChildren<object>) {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let active = true;
    loadSettings(db)
      .catch(() => DEFAULT_SETTINGS)
      .then((loaded) => active && setSettings(loaded));
    return () => {
      active = false;
    };
  }, [db]);

  if (!settings) return null;

  const setSetting = <K extends SettingKey>(key: K, value: Settings[K]) => {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
    saveSetting(db, key, value).catch((error) => console.warn(`Could not save ${key}`, error));
  };

  return (
    <SettingsContext.Provider value={{ settings, setSetting }}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
