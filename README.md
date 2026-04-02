# wasmCloud TypeScript

TypeScript examples and project templates for building [wasmCloud][wasmcloud] components.

[wasmcloud]: https://github.com/wasmcloud/wasmcloud

## 📚 Component Examples

> [!NOTE]
> New to wasmCloud components in TypeScript?
>
> Start with the [wasmCloud TypeScript language guide][docs-ts]

[wasmCloud Components][docs-components] are WebAssembly components that serve as applications on the wasmCloud platform.

| Example                                         | Description                                       |
| ----------------------------------------------- | ------------------------------------------------- |
| [TypeScript Components](./examples/components/) | Sample wasmCloud components written in TypeScript |

[docs-components]: https://wasmcloud.com/docs/concepts/components/
[docs-ts]: https://wasmcloud.com/docs/wash/developer-guide/language-support/typescript/

## 🧩 Project Templates

Project templates for scaffolding new wasmCloud component projects.

These templates can be used with `wash new`:

```bash
wash new https://github.com/wasmCloud/typescript.git --name my-project --subfolder templates/<template-name>
```

| Template                                                                  | Description                                                        |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [http-hello-world-hono](./templates/http-hello-world-hono/)               | Minimal HTTP server component using Hono                           |
| [http-hello-world-fetch](./templates/http-hello-world-fetch/)             | Minimal HTTP server component using the `fetch()` API              |
| [http-client](./templates/http-client/)                                   | Component that makes outgoing HTTP requests                        |
| [http-service-hono](./templates/http-service-hono/)                       | HTTP service component powered by Hono                             |
| [http-blobstore-service-hono](./templates/http-blobstore-service-hono/)   | HTTP service component powered by Hono, backed by `wasi:blobstore` |
| [http-kv-service-hono](./templates/http-kv-service-hono/)                 | HTTP service component powered by Hono, backed by `wasi:keyvalue`  |
| [service-tcp-echo](./templates/service-tcp-echo/)                         | Service + component template demonstrating `wasi:sockets` TCP      |

See the [templates README](./templates/README.md) for more details.

## 🛠️ Contributing

For development setup, workflow, and contribution guidelines, see the [Contributing Guide](./CONTRIBUTING.md).

## 📄 License

This project is licensed under the [Apache 2.0 License](https://github.com/wasmCloud/wasmCloud/blob/main/LICENSE).

## 🔗 Related

- [wasmCloud](https://github.com/wasmCloud/wasmCloud) - The main wasmCloud runtime
- [wasmCloud Documentation](https://wasmcloud.com/docs) - Comprehensive guides and API reference
- [WebAssembly Component Model](https://component-model.bytecodealliance.org/) - The foundation for wasmCloud components
