# wasi-config-from-k8s-env

A WebAssembly component that reads runtime configuration via the `wasi:config/store` interface, demonstrating how wasmCloud sources config from Kubernetes ConfigMaps and Secrets.

## Overview

This component exposes two HTTP routes:

| Route | Description |
|---|---|
| `GET /config` | Returns all config values as a JSON object |
| `GET /config/:key` | Returns a single config value by key |

Config values are injected at runtime by a wasmCloud config provider. On Kubernetes, this provider can be backed by a ConfigMap or Secret — the component reads them transparently without any Kubernetes-specific code.

## Quickstart

### Prerequisites

| Tool | Description |
|---|---|
| `wash` | [wasmCloud Shell](https://github.com/wasmCloud/wash) — builds and runs components |
| `node` / `npm` | Node.js runtime |

### Run locally

```console
wash dev
```

`wash dev` builds the component, runs it locally on `localhost:8000`, and watches for changes.

### Try it out

```console
# list all config values
curl localhost:8000/config

# get a specific value
curl localhost:8000/config/my_key
```

## Build

```console
npm install
npm run build
```

> **Note:** `npm run build` runs `setup:wit` first, which fetches WIT dependencies and generates TypeScript types into `generated/types/`. Run this before opening the project in an IDE to resolve type errors.

## Kubernetes deployment

In a wasmCloud deployment on Kubernetes, you can pass config values to the component in your WorkloadDeployment manifest. In production, these can be sourced from a Kubernetes ConfigMap or Secret. See the wasmCloud [Secrets and Configuration](https://wasmcloud.com/docs/kubernetes-operator/operator-manual/secrets-and-configuration/) documentation for more information.

```yaml
apiVersion: runtime.wasmcloud.dev/v1alpha1
kind: WorkloadDeployment
metadata:
  name: wasi-config-from-k8s-env
spec:
  replicas: 1
  template:
    spec:
      hostSelector:
        hostgroup: default
      components:
        - name: wasi-config-from-k8s-env
          image: ghcr.io/[your-org]/wasi-config-from-k8s-env:0.1.0
          localResources:
            environment:
              config:
                DB_NAME: myapp
                LOG_LEVEL: info
                API_BASE_URL: https://example.com
      hostInterfaces:
        - namespace: wasi
          package: http
          interfaces:
            - incoming-handler
          config:
            host: localhost
        - namespace: wasi
          package: config
          interfaces:
            - store

```

The component reads those values with no awareness of Kubernetes — the same code works in local `wash dev`, in a baremetal wasmCloud host, or on Kubernetes.

See `deployment.yaml` for a full example using the `WorkloadDeployment` CRD.
