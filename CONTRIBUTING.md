# Contributing to wasmCloud TypeScript

Thank you for your interest in contributing to the wasmCloud TypeScript ecosystem! This guide will help you get started with contributing to our monorepo containing TypeScript libraries, applications, and examples.

## 📋 Table of Contents

- [Development Setup](#development-setup)
- [Repository Structure](#repository-structure)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Working with wasmCloud](#working-with-wasmcloud)

## 🛠️ Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (version specified in `.tool-versions`)
- [Yarn](https://yarnpkg.com/) (managed via Corepack)
- [wash CLI](https://wasmcloud.com/docs/installation) (for working with wasmCloud applications)

### Initial Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/typescript.git
   cd typescript
   ```

2. **Enable Corepack and install dependencies:**
   ```bash
   corepack enable
   yarn install
   ```

3. **Build all packages:**
   ```bash
   yarn turbo:build
   ```

4. **Verify everything works:**
   ```bash
   yarn turbo:lint
   yarn turbo:test
   ```

## 📁 Repository Structure

This is a monorepo organized as follows:

```
├── apps/                    # Applications
│   └── washboard-ui/       # Web dashboard for wasmCloud
├── packages/               # Reusable libraries
│   ├── lattice-client-core/     # Core lattice client
│   ├── lattice-client-react/    # React integration
│   ├── eslint-config/           # Shared ESLint config
│   ├── prettier-config/         # Shared Prettier config
│   └── tsconfig/               # Shared TypeScript config
├── examples/               # Example components and usage
│   └── components/         # TypeScript component examples
└── .github/                # GitHub configuration and workflows
```

### Package Dependencies

- **Core packages** (`lattice-client-core`) should have minimal dependencies
- **React packages** can depend on core packages and React ecosystem
- **Applications** can depend on any packages in the monorepo
- **Examples** should be standalone and self-contained

## 🔄 Development Workflow

### Building

```bash
# Build all packages
yarn turbo:build

# Build specific package
yarn workspace @wasmcloud/lattice-client-core build

# Build with watch mode (development)
yarn turbo:dev
```

### Testing

```bash
# Run all tests
yarn turbo:test

# Run unit tests only
yarn turbo:test:unit

# Run E2E tests only (requires wasmCloud setup)
yarn turbo:test:e2e

# Test specific package
yarn workspace @wasmcloud/lattice-client-core test
```

### Linting and Formatting

```bash
# Check linting
yarn turbo:lint

# Fix linting issues
yarn turbo:lint:fix

# Check formatting
yarn turbo:format

# Fix formatting issues
yarn turbo:format:fix
```

## 📝 Code Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Use meaningful variable and function names
- Document public APIs with JSDoc comments

### Code Style

We use ESLint and Prettier for consistent code formatting:

- **ESLint**: Enforces code quality and consistency rules
- **Prettier**: Handles code formatting
- **Import ordering**: Imports should be ordered (external, internal, relative)

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Directories**: `kebab-case`
- **Functions/variables**: `camelCase`
- **Types/Interfaces**: `PascalCase`
- **Constants**: `SCREAMING_SNAKE_CASE`

## 🧪 Testing

### Unit Tests

- Write unit tests for all business logic
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern
- Mock external dependencies

### Integration Tests

- Test component interactions
- Verify API contracts
- Test error scenarios

### E2E Tests

- Test complete user workflows
- Require running wasmCloud infrastructure
- Use realistic test data

### Test Organization

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {
      // Test implementation
    });
    
    it('should handle edge case', () => {
      // Test implementation
    });
    
    it('should throw error for invalid input', () => {
      // Test implementation
    });
  });
});
```

## 📝 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(lattice-client): add support for new lattice events
fix(washboard-ui): resolve connection timeout issues
docs(readme): update installation instructions
test(lattice-client): add unit tests for event handling
```

### Commit Requirements

- **Conventional commits**: All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification
- **Sign-off required**: All commits must be signed off (`git commit -s`)
- **Descriptive messages**: Explain what and why, not just what
- **Single responsibility**: One logical change per commit
- **Working state**: Each commit should leave the code in a working state

## 🔀 Pull Request Process

### Before Opening a PR

1. **Create a feature branch:**
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes and test:**
   ```bash
   yarn turbo:build
   yarn turbo:lint
   yarn turbo:test
   ```

3. **Commit with sign-off:**
   ```bash
   git commit -s -m "feat: your descriptive commit message"
   ```

4. **Add changeset if needed:**
   ```bash
   yarn changeset
   ```
   See [Adding Changesets](#adding-changesets) section for details on when this is required.

### PR Requirements

- **Descriptive title**: Use conventional commit format
- **Clear description**: Explain what changes and why
- **Link issues**: Reference related issues with "Fixes #123"
- **Tests**: Include tests for new functionality
- **Documentation**: Update docs for user-facing changes
- **Changelog**: Add changeset for version bump if needed

### Adding Changesets

A changeset should be added for any changes that affect the public API or functionality of published packages. This includes:

- **New features** - Adding new functions, classes, or capabilities
- **Bug fixes** - Fixing issues that affect package behavior
- **Breaking changes** - Any changes that require users to update their code
- **Dependencies** - Adding, removing, or updating package dependencies

**Do NOT add changesets for:**
- Documentation-only changes
- Internal refactoring that doesn't affect the public API
- Development tooling changes (ESLint config, test setup, etc.)
- Example code changes

To add a changeset for changes that should trigger a version bump:

```bash
yarn changeset
```

Follow the prompts to describe your changes and select affected packages.

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated and passing
- [ ] Documentation updated if needed
- [ ] Changeset added if needed
- [ ] All commits are signed off
- [ ] CI checks are passing

## 🌐 Working with wasmCloud

### Setting Up wasmCloud

For testing applications that interact with wasmCloud:

1. **Install wash CLI:**
   ```bash
   # See https://wasmcloud.com/docs/installation
   curl -s https://raw.githubusercontent.com/wasmCloud/wasmCloud/main/install.sh | bash
   ```

2. **Start wasmCloud infrastructure:**
   ```bash
   wash up
   ```

   This starts:
   - NATS server with WebSocket support (default: `ws://localhost:4223`)
   - wasmCloud host
   - wadm (wasmCloud Application Deployment Manager)

3. **Stop wasmCloud infrastructure:**
   ```bash
   wash down
   ```

### Custom NATS Configuration

To use a different NATS WebSocket port:

```bash
# Stop existing services
wash down

# Start with custom port
wash up --nats-websocket-port 4001
# or
NATS_WEBSOCKET_PORT=4001 wash up
```

### Washboard UI Development

The Washboard UI connects to NATS WebSocket by default. For development:

1. **Start wasmCloud:**
   ```bash
   wash up
   ```

2. **Start development server:**
   ```bash
   yarn workspace washboard-ui dev
   ```

3. **Access the UI:**
   Open http://localhost:5173 in your browser

## 🐛 Debugging

### Common Issues

- **Build errors**: Ensure dependencies are installed and packages are built in correct order
- **Connection issues**: Verify wasmCloud and NATS are running
- **Import errors**: Run `yarn turbo:build` to build TypeScript packages

### Debug Scripts

```bash
# Check workspace dependencies
yarn workspaces info

# Verify TypeScript compilation
yarn tsc --noEmit

# Check for circular dependencies
yarn madge --circular packages/*/src/index.ts
```

## 🎯 Getting Help

- **Issues**: Check existing [GitHub issues](https://github.com/wasmCloud/typescript/issues)
- **Discussions**: Use [GitHub Discussions](https://github.com/wasmCloud/typescript/discussions)
- **Community**: Join the [wasmCloud Slack](https://slack.wasmcloud.com/)
- **Documentation**: See [wasmCloud docs](https://wasmcloud.com/docs)

## 🚀 Release Process

Releases are handled automatically via GitHub Actions when changesets are merged to main:

1. **Changesets create version PR**: Automatic PR with version bumps
2. **Maintainer merges version PR**: Triggers release workflow
3. **Packages published**: Automatically published to npm

---

Thank you for contributing to wasmCloud TypeScript! Your contributions help make WebAssembly and wasmCloud more accessible to the TypeScript ecosystem.
