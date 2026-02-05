# wasmCloud TypeScript

TypeScript ecosystem libraries, applications, and examples for [wasmCloud][wasmcloud].

[wasmcloud]: https://github.com/wasmcloud/wasmcloud

## Overview

This repository is a TypeScript monorepo containing libraries, applications, and examples for building with wasmCloud. It includes:

- **Libraries** (`packages/`) - Reusable TypeScript packages for wasmCloud development
- **Applications** (`apps/`) - Production applications built with wasmCloud
- **Examples** (`examples/`) - Sample components and usage patterns
- **Templates** (`templates/`) - Project templates for scaffolding new wasmCloud components

## 📦 Packages

| Package                                                             | Description                                                  |
| ------------------------------------------------------------------- | ------------------------------------------------------------ |
| [@wasmcloud/lattice-client-core](./packages/lattice-client-core/)   | Core TypeScript client for wasmCloud lattice operations      |
| [@wasmcloud/lattice-client-react](./packages/lattice-client-react/) | React hooks and components for wasmCloud lattice integration |
| [@wasmcloud/eslint-config](./packages/eslint-config/)               | Shared ESLint configuration                                  |
| [@wasmcloud/prettier-config](./packages/prettier-config/)           | Shared Prettier configuration                                |
| [@wasmcloud/tsconfig](./packages/tsconfig/)                         | Shared TypeScript configuration                              |

## 🚀 Applications

| Application                          | Description                                         |
| ------------------------------------ | --------------------------------------------------- |
| [Washboard UI](./apps/washboard-ui/) | Web-based dashboard for managing wasmCloud lattices |

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
[docs-ts]: https://wasmcloud.com/docs/developer/languages/typescript/components/
[dir-components]: ./examples/components/

## 🧩 Project Templates

Project templates for scaffolding new wasmCloud component projects.

These templates can be used with `wash new`:

```bash
wash new https://github.com/wasmCloud/typescript.git --name my-project --subfolder templates/<template-name>
```

| Template                                            | Description                                     |
| --------------------------------------------------- | ----------------------------------------------- |
| [http-hello-world](./templates/http-hello-world/)   | Minimal HTTP server component        |
| [http-client](./templates/http-client/)             | Component that makes outgoing HTTP requests     |
| [http-service-hono](./templates/http-service-hono/) | HTTP service component powered by Hono          |

See the [templates README](./templates/README.md) for more details.

## 🛠️ Development

For detailed development setup, workflow, and contribution guidelines, please see our [Contributing Guide](./CONTRIBUTING.md).

### Quick Start

Install Yarn:

```bash
npm install -g yarn
```

Install dependencies:

```bash
yarn install
```

Build all packages:

```bash
yarn build
```

Run development servers:

```bash
yarn dev
```

### Monorepo Structure

This repository uses:

- **[Yarn Workspaces](https://yarnpkg.com/features/workspaces)** for dependency management
- **[Turbo](https://turbo.build/)** for build orchestration and caching
- **[Changesets](https://github.com/changesets/changesets)** for version management and publishing

## 📖 Documentation

- [wasmCloud Documentation](https://wasmcloud.com/docs) - Official wasmCloud documentation
- [wasmCloud TypeScript Guide](https://wasmcloud.com/docs/developer/languages/typescript/) - TypeScript-specific wasmCloud development guide
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute to this repository

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Development setup and workflow
- Code style and standards
- Testing requirements
- Commit conventions
- Pull request process

## 📄 License

This project is licensed under the [Apache 2.0 License](https://github.com/wasmCloud/wasmCloud/blob/main/LICENSE).

## 🔗 Related

- [wasmCloud](https://github.com/wasmCloud/wasmCloud) - The main wasmCloud runtime
- [wasmCloud Documentation](https://wasmcloud.com/docs) - Comprehensive guides and API reference
- [WebAssembly Component Model](https://component-model.bytecodealliance.org/) - The foundation for wasmCloud components
