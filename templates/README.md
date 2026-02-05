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
├── ...                           # other configuration files (e.g. bundler configuration)
└── tsconfig.json        # TypeScript configuration
```

### Template usage

Each template may be used with `wash new`. For example, to create a new project with the `http-client` template:

```bash
wash new https://github.com/wasmCloud/typescript.git --name http-client --subfolder templates/http-client
```

Templates include a `wash` configuration file (`.wash/config.yaml`) that runs `npm install` when a template is cloned with `wash new`.

After running `wash new`, you will be prompted to execute the template's setup command. Hit enter for yes (the default).

```console
✔ Execute template setup command 'npm install'? This may modify the new project.
```

### Template conventions

Every template follows the convention of namespace as `wasmcloud`, package as `templates`, and the world is prefixed with the language, e.g. for this repo `typescript`, and then the use-case. 

We version our templates for easy future updates (e.g. when adding support for WASIP3).

For example:

```wit
// our templates are on version 0.1.0
package wasmcloud:templates@0.1.0;

// language: typescript
// use-case: http-service-hono
world typescript-http-service-hono {
  export wasi:http/incoming-handler@0.2.3;
}
```
