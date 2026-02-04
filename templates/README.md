# wasmCloud TypeScript Templates

Project templates for building wasmCloud components with TypeScript.

## Available Templates

| Template | Description |
| -------- | ----------- |
| [http-hello-world](./http-hello-world/) | A minimal HTTP component using the Service Worker fetch event pattern |
| [http-client](./http-client/) | A component that makes outgoing HTTP requests using the fetch API |
| [http-service-hono](./http-service-hono/) | An HTTP service component powered by [Hono](https://hono.dev/) |

## Template Structure

Each template follows a similar structure:

```
template-name/
├── .wash/
│   └── config.yaml      # wash CLI configuration
├── src/
│   └── *.ts             # TypeScript source code
├── wit/
│   └── world.wit        # Component world definition
├── package.json         # npm package configuration
└── tsconfig.json        # TypeScript configuration
```
