# HTTP stdout/stderr

A small WebAssembly component that demonstrates writing to stdout and stderr
from an HTTP handler using [`wasi:cli`](https://github.com/WebAssembly/wasi-cli)
streams.

The component responds to `GET /?name=<name>`:

## Usage

```bash
npm install
npm run build
npm run serve
```

Then send a request:

```bash
curl 'localhost:8000/?name=john'
```
