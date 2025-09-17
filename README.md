# wasmCloud TypeScript

TypeScript ecosystem libraries, applications, and examples for [wasmCloud][wasmcloud].

[wasmcloud]: https://github.com/wasmcloud/wasmcloud

## Overview

This repository is a TypeScript monorepo containing libraries, applications, and examples for building with wasmCloud. It includes:

- **Libraries** (`packages/`) - Reusable TypeScript packages for wasmCloud development
- **Applications** (`apps/`) - Production applications built with wasmCloud
- **Examples** (`examples/`) - Sample components and usage patterns

## 📦 Packages

### Core Libraries

- **[@wasmcloud/lattice-client-core](./packages/lattice-client-core/)** - Core TypeScript client for wasmCloud lattice operations
- **[@wasmcloud/lattice-client-react](./packages/lattice-client-react/)** - React hooks and components for wasmCloud lattice integration

### Development Tools

- **[@wasmcloud/eslint-config](./packages/eslint-config/)** - Shared ESLint configuration
- **[@wasmcloud/prettier-config](./packages/prettier-config/)** - Shared Prettier configuration  
- **[@wasmcloud/tsconfig](./packages/tsconfig/)** - Shared TypeScript configuration

## 🚀 Applications

- **[Washboard UI](./apps/washboard-ui/)** - Web-based dashboard for managing wasmCloud lattices

## 📚 Examples

### Components

> [!NOTE]
> New to wasmCloud components in TypeScript?
>
> Start with the [wasmCloud TypeScript language guide][docs-ts]

[wasmCloud Components][docs-components] are WebAssembly components that serve as applications on the wasmCloud platform.

This repository includes examples of components written in TypeScript in the [`examples/components`][dir-components] directory.

[docs-components]: https://wasmcloud.com/docs/concepts/components/
[docs-ts]: https://wasmcloud.com/docs/developer/languages/typescript/components/
[dir-components]: ./examples/components/

## 🛠️ Development

For detailed development setup, workflow, and contribution guidelines, please see our [Contributing Guide](./CONTRIBUTING.md).

### Quick Start

```bash
# Enable Corepack and install dependencies
corepack enable
yarn install

# Build all packages
yarn turbo:build

# Run development servers
yarn turbo:dev
```

### Monorepo Structure

This repository uses:
- **[Yarn Workspaces](https://yarnpkg.com/features/workspaces)** for dependency management
- **[Turbo](https://turbo.build/)** for build orchestration and caching
- **[Changesets](https://github.com/changesets/changesets)** for version management and publishing

## 📖 Documentation

- [wasmCloud Documentation](https://wasmcloud.com/docs) - Official wasmCloud documentation
- [TypeScript Guide](https://wasmcloud.com/docs/developer/languages/typescript/) - TypeScript-specific wasmCloud development guide
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
