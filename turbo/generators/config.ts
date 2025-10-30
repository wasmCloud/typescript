import type {PlopTypes} from '@turbo/gen';

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator('component', {
    description: 'Generate a new TypeScript component example',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is the name of the component? (e.g., http-hello-world)',
        validate: (input: string) => {
          if (!input) {
            return 'Component name is required';
          }
          if (!/^[a-z][a-z0-9-]*$/.test(input)) {
            return 'Component name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'What is the description of the component?',
        default: 'A WebAssembly component example written in TypeScript',
      },
      {
        type: 'input',
        name: 'packageName',
        message: 'What is the wasmCloud package name? (e.g., wasmcloud:hello)',
        default: (answers: {name: string}) => {
          // Convert http-hello-world to hello
          const shortName = answers.name.replace(/^http-/, '');
          return `wasmcloud:${shortName}`;
        },
        validate: (input: string) => {
          if (!input) {
            return 'Package name is required';
          }
          if (!/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/.test(input)) {
            return 'Package name must be in format "namespace:name" with lowercase letters, numbers, and hyphens';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'worldName',
        message: 'What is the world name for the component?',
        default: (answers: {packageName: string}) => {
          // Extract the name after the colon
          return answers.packageName.split(':')[1];
        },
      },
    ],
    actions: [
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/examples/components/{{ dashCase name }}/package.json',
        templateFile: 'templates/component/package.json.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/examples/components/{{ dashCase name }}/tsconfig.json',
        templateFile: 'templates/component/tsconfig.json.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/examples/components/{{ dashCase name }}/.gitignore',
        templateFile: 'templates/component/.gitignore.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/examples/components/{{ dashCase name }}/.nvmrc',
        templateFile: 'templates/component/.nvmrc.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/examples/components/{{ dashCase name }}/README.md',
        templateFile: 'templates/component/README.md.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/examples/components/{{ dashCase name }}/project-generate.toml',
        templateFile: 'templates/component/project-generate.toml.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/examples/components/{{ dashCase name }}/wasmcloud.toml',
        templateFile: 'templates/component/wasmcloud.toml.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/examples/components/{{ dashCase name }}/local.wadm.yaml',
        templateFile: 'templates/component/local.wadm.yaml.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/examples/components/{{ dashCase name }}/src/{{ dashCase name }}.ts',
        templateFile: 'templates/component/src/component.ts.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/examples/components/{{ dashCase name }}/wit/world.wit',
        templateFile: 'templates/component/wit/world.wit.hbs',
      },
      {
        type: 'modify',
        path: '{{ turbo.paths.root }}/.github/workflows/examples_.yml',
        pattern: /\n  examples-check:/,
        template: `
          - folder: {{ dashCase name }}
            wasm-bin: {{ snakeCase name }}_s.wasm
            test-command: |
              RESPONSE=$(curl http://127.0.0.1:8000 || echo '')
              [[ "$RESPONSE" == 'Hello from {{ titleCase name }}!' ]] && TEST_RESULT=1 || TEST_RESULT=0

  examples-check:`,
      },
      async (answers, config, plop) => {
        const childProcess = await import('node:child_process');
        const absolutePath = plop?.renderString(
          '{{ turbo.paths.root }}/examples/components/{{ dashCase name }}',
          answers,
        );
        const relativePath = absolutePath?.replace(process.cwd(), '');
        console.log(`>>> Installing Dependencies in: "${relativePath}"`);
        childProcess.execSync('npm install', {cwd: absolutePath, encoding: 'utf8'});
        return `${relativePath}/package-lock.json (npm install)`;
      },
    ],
  });
}
