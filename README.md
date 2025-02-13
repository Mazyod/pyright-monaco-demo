# Pyright Monaco Demo

[![Vite](https://img.shields.io/badge/Vite-latest-646CFF?logo=vite)](https://vitejs.dev) [![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)

## About this Fork

> [!IMPORTANT]
> This fork of Pyright Playground is focused on demonstrating the Pyright - Monaco Editor integration by reducing the code and reorganizing it to reusable parts.
>
> A lot of effort went into organizing the code to make it modular and reusable. You should essentially be able to copy/paste the `LspMonaco` directory and with relative ease integrated them with your own projects.

```typescript
const monacoLsp = useMonacoLsp({
  initialCode: initialState.code,
  settings: lspSettings,
  apiAddressPrefix: "...",
});
```

<img width="820" alt="image" src="https://github.com/user-attachments/assets/bc999ed5-7f4a-488c-85fc-0a43a171ec23" />

---

[Pyright](https://github.com/Microsoft/pyright) is a static type checker for Python.

[Pyright Playground](https://pyright-play.net) provides a web experience for running Pyright.

## Community

Do you have questions about Pyright Playground? Post your questions in [the discussion section](https://github.com/erictraut/pyright-playground/discussions).

To report a bug or request an enhancement for Pyright Playground, file a new issue in the [pyright-playground issue tracker](https://github.com/erictraut/pyright-playground/issues).

To report a bug or request an enhancement for Pyright, file a new issue in the [pyright issue tracker](https://github.com/microsoft/pyright/issues).
