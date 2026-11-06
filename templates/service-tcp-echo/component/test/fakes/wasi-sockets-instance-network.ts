// In-memory wasi:sockets/instance-network.
// The component only passes the network handle through to the socket,
// so a single marker object is enough to check it arrives there.

export const network = { name: 'instance-network' };

export function instanceNetwork(): typeof network {
  return network;
}
