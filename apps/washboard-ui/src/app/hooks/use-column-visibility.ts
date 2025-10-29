import * as React from 'react';

import {useSettings} from './use-settings';
import {WadmManagedAssetOption} from '../components/wadm-indicator/types';

export const WADM_MANAGED_COLUMN_ID = 'wadm-managed' as const;

type Column = {
  id?: string;
};

const useColumnVisibility = <T extends Column>(columns: T[]) => {
  const {wadmManagedAsset} = useSettings();

  const [columnVisibility, setColumnVisibility] = React.useState(
    columns.reduce((accumulator, column) => {
      if (typeof column.id === 'string') {
        return Object.assign(accumulator, {[column.id]: column.id !== WADM_MANAGED_COLUMN_ID});
      }
      return accumulator;
    }, {}),
  );

  return {
    columnVisibility: {
      ...columnVisibility,
      [WADM_MANAGED_COLUMN_ID]: wadmManagedAsset !== WadmManagedAssetOption.None,
    },
    setColumnVisibility,
  };
};
export {useColumnVisibility};
