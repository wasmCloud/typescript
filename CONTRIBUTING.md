# Contributing to wasmCloud TypeScript

Thank you for your interest in contributing to the wasmCloud TypeScript ecosystem! This guide will help you get started with contributing to our collection of TypeScript examples and project templates for wasmCloud.

## Table of Contents

- [Development Setup](#development-setup)
- [Repository Structure](#repository-structure)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Working with wasmCloud](#working-with-wasmcloud)
- [Debugging](#debugging)
- [Getting Help](#getting-help)
## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (version specified in `.tool-versions`)
- [wash CLI](https://wasmcloud.com/docs/installation) (for working with wasmCloud applications)

### Initial Setup

1. **Fork and clone the repository:**

   ```bash
   git clone https://github.com/your-username/typescript.git
   cd typescript
   ```

2. **Install dependencies for the example or template you're working on:**

   ```bash
   cd examples/components/http-hello-world
   npm install
   ```

## Repository Structure

The repository is organized as follows:

```
├── examples/               # Example components and usage
│   └── components/         # TypeScript component examples
├── templates/              # Project templates for wash new
└── .github/                # GitHub configuration and workflows
```

### Examples

| Example                                         | Path                   | Description                                       |
| ----------------------------------------------- | ---------------------- | ------------------------------------------------- |
| [TypeScript Components](./examples/components/) | `examples/components/` | Sample wasmCloud components written in TypeScript |

#### Creating New Example Components

To create a new example component, copy the structure of an existing example. See [examples/README.md](./examples/README.md) for details on the expected structure and configuration.

### Package Dependencies

- **Examples** should be standalone and self-contained

## Development Workflow

Each example and template is a standalone npm package. Navigate to the directory you're working in and use npm scripts directly.

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Lint and Format

Check code style and linting:

```bash
npm run lint
```

Automatically fix linting issues:

```bash
npm run lint:fix
```

Check code formatting:

```bash
npm run format
```

Automatically fix formatting issues:

```bash
npm run format:fix
```

## Code Standards

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
- **Functions/Variables**: `camelCase`
- **Types/Interfaces**: `PascalCase`
- **Constants/Globals**: `SCREAMING_SNAKE_CASE`

## Testing

### Unit Tests

- Write unit tests for all business logic
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern
- Mock external dependencies

### Integration Tests

- Test component interactions
- Verify API contracts
- Test error scenarios
- Avoid mocks where possible (prefer containerized dependencies for realistic testing environments)

### E2E Tests

- Test complete user workflows
- Require running wasmCloud infrastructure
- Use realistic test data

### Test Organization

```typescript
suite('Component', () => {
  describe('feature', () => {
    test('should handle normal case', () => {
      // Test implementation
    });

    test('should handle edge case', () => {
      // Test implementation
    });

    test('should throw error for invalid input', () => {
      // Test implementation
    });
  });
});
```

## Commit Guidelines

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

### Scopes

Supported scopes include:

- `examples`: Example components and usage
- `deps`: Dependency updates
- `ci`: CI/CD changes

### Examples

```bash
docs(readme): update installation instructions
```

### Commit Requirements

- **Conventional commits**: All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification
- **Sign-off required**: All commits must be signed off (`git commit -s`) as per [Developer Certificate of Origin (DCO)](https://developercertificate.org/)
- **Descriptive messages**: Explain what and why, not just what
- **Single responsibility**: One logical change per commit
- **Working state**: Each commit should leave the code in a working state

## Pull Request Process

### Before Opening a PR

1. **Create a feature branch:**

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes and test:**

   ```bash
   npm run build
   npm run lint
   npm test
   ```

3. **Commit with sign-off:**

   ```bash
   git commit -s -m "feat: your descriptive commit message"
   ```

### PR Requirements

Before creating a PR, ensure that your contribution(s) meet the following criteria:

- **Descriptive title**: Use conventional commit format
- **Clear description**: Explain what changes and why
- **Link issues**: Reference related issues with "Fixes #123"
- **Tests**: Include tests for new functionality
- **Documentation**: Update docs for user-facing changes

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated and passing
- [ ] Documentation updated if needed
- [ ] All commits are signed off
- [ ] CI checks are passing

## Working with wasmCloud

To run and test examples locally you'll need the [wash CLI](https://wasmcloud.com/docs/installation).

Start a local wasmCloud environment:

```bash
wash up
```

Stop it when done:

```bash
wash down
```

## Debugging

### Common Issues

- **Build errors**: Ensure dependencies are installed (`npm install`) and try `npm run build`
- **Connection issues**: Verify wasmCloud and NATS are running (`wash up`)

## Getting Help

- **Issues**: Check existing [GitHub issues](https://github.com/wasmCloud/typescript/issues)
- **Discussions**: Use [GitHub Discussions](https://github.com/wasmCloud/typescript/discussions)
- **Community**: Join the [wasmCloud Slack](https://slack.wasmcloud.com/)
- **Documentation**: See [wasmCloud docs](https://wasmcloud.com/docs)

---

Thank you for contributing to wasmCloud TypeScript! Your contributions help make WebAssembly and wasmCloud more accessible to the TypeScript ecosystem.
