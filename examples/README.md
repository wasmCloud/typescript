# wasmCloud TypeScript Examples

Example components for building wasmCloud applications with TypeScript.

## Available Examples

| Example | Description |
| ------- | ----------- |
| [http-hello-world](./components/http-hello-world/) | Minimal HTTP server component |
| [http-password-checker](./components/http-password-checker/) | HTTP API for checking password strength using npm packages |
| [http-server-with-hono](./components/http-server-with-hono/) | HTTP server component with routing powered by [Hono](https://hono.dev) |
| [http-streaming](./components/http-streaming/) | HTTP component that streams a response using `wasi:io` primitives |
| [http-axios](./components/http-axios/) | Component that makes outgoing HTTP requests using [Axios](https://axios-http.com) |
| [bundled-esbuild](./components/bundled-esbuild/) | TypeScript component bundled with [esbuild](https://esbuild.github.io) |
| [bundled-rsbuild](./components/bundled-rsbuild/) | TypeScript component bundled with [Rsbuild](https://rsbuild.dev) |

## Example Structure

Each example follows a similar structure:

```
example-name/
├── .wash/
│   └── config.yaml      # wash CLI configuration (build command and component path)
├── src/
│   └── *.ts             # TypeScript source code
├── wit/
│   └── world.wit        # Component world definition
├── nodemon.json         # File watcher configuration for wash dev
├── package.json         # npm package configuration
├── tsconfig.json        # TypeScript configuration
└── wkg.lock             # WIT dependency lock file
```

## Running an example

Each example is a standalone npm package. From an example directory:

```bash
# Install dependencies and build
npm run install-and-build

# Start a local development session with hot reload
npm run dev
```

`npm run dev` runs `nodemon`, which watches `src/` for changes and runs `wash dev` on each change. `wash dev` builds the component, starts a local wasmCloud host, and deploys everything needed to run the application.

## Adding a new example

To add a new example component, create a new directory under `examples/components/` following the structure above, then register it in `.github/workflows/examples_.yml` to include it in CI.
