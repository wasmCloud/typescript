import * as React from 'react';

import {type LatticeClient} from '@wasmcloud/lattice-client-core';

import {LatticeClientContext} from '@/context/lattice-client-context';

export function useLatticeClient(): LatticeClient {
  const client = React.useContext(LatticeClientContext);

  if (!client)
    throw new Error('You must provide a LatticeClient instance through <LatticeClientProvider>');

  return client;
}
