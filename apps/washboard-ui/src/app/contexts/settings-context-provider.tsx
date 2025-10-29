import {PropsWithChildren, ReactElement, useEffect} from 'react';
import {useLocalStorage} from 'usehooks-ts';

import {DarkModeOption, SettingsContext} from './settings-context';
import {WadmManagedAssetOption} from '../components/wadm-indicator/types';

export function SettingsProvider({children}: PropsWithChildren): ReactElement {
  const [darkMode, setDarkMode] = useLocalStorage('theme', DarkModeOption.System);

  const [wadmManagedAsset, setWadmManagedAsset] = useLocalStorage(
    'wadmManagedAsset',
    WadmManagedAssetOption.Logo,
  );

  useEffect(() => {
    const optionIsDark = darkMode === DarkModeOption.Dark;
    const optionIsSystemAndPrefersDark =
      darkMode === DarkModeOption.System &&
      globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', optionIsDark || optionIsSystemAndPrefersDark);
  }, [darkMode]);

  return (
    <SettingsContext.Provider
      value={{darkMode, setDarkMode, wadmManagedAsset, setWadmManagedAsset}}
    >
      {children}
    </SettingsContext.Provider>
  );
}
