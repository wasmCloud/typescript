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

[docs-components]: https://wasmcloud.com/docs/overview/workloads/components/
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
| [http-api-with-distributed-workloads](./templates/http-api-with-distributed-workloads/) | HTTP API + worker template demonstrating distributed workloads via `wasmcloud:messaging` |
| [http-handler-hono](./templates/http-handler-hono/)                       | HTTP handler component powered by Hono                             |
| [http-blobstore-handler-hono](./templates/http-blobstore-handler-hono/)   | HTTP handler component powered by Hono, backed by `wasi:blobstore` |
| [http-filesystem-handler-hono](./templates/http-filesystem-handler-hono/) | HTTP handler component powered by Hono, backed by `wasi:filesystem` |
| [http-kv-handler-hono](./templates/http-kv-handler-hono/)                 | HTTP handler component powered by Hono, backed by `wasi:keyvalue`  |
| [http-logging-handler-hono](./templates/http-logging-handler-hono/)       | HTTP handler component powered by Hono, backed by `wasi:logging`   |
| [service-tcp-echo](./templates/service-tcp-echo/)                         | Service + component template demonstrating `wasi:sockets` TCP      |

See the [templates README](./templates/README.md) for more details.

### Versioned releases

The examples and templates are released as `vX.Y.Z` [GitHub Releases][releases]. Add `--git-ref`
to `wash new` to use a template from a release instead of `main`:

```bash
wash new https://github.com/wasmCloud/typescript.git --name my-project --subfolder templates/<template-name> --git-ref v2.12.0
```

Each release attaches `wasmcloud-typescript-vX.Y.Z.tar.gz`, the source of the tag, with its SPDX
SBOM, a `SHA256SUMS` file and Sigstore bundles. To verify a download with the
[GitHub CLI](https://cli.github.com/):

```bash
gh attestation verify wasmcloud-typescript-v2.12.0.tar.gz --repo wasmCloud/typescript
```

[SUPPORT.md](./SUPPORT.md) says which release is supported.

[releases]: https://github.com/wasmCloud/typescript/releases

## 🛠️ Contributing

For development setup, workflow, and contribution guidelines, see the [Contributing Guide](./CONTRIBUTING.md).

## 📄 License

This project is licensed under the [Apache 2.0 License](https://github.com/wasmCloud/wasmCloud/blob/main/LICENSE).

## 🔗 Related

- [wasmCloud](https://github.com/wasmCloud/wasmCloud) - The main wasmCloud runtime
- [wasmCloud Documentation](https://wasmcloud.com/docs) - Comprehensive guides and API reference
- [WebAssembly Component Model](https://component-model.bytecodealliance.org/) - The foundation for wasmCloud components
