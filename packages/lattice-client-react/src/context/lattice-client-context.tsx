import * as React from 'react';

import {type LatticeClient} from '@wasmcloud/lattice-client-core';

export const LatticeClientContext = React.createContext<LatticeClient | undefined>(undefined);
