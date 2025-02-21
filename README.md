# Pyright Monaco Demo

[![Vite](https://img.shields.io/badge/Vite-latest-646CFF?logo=vite)](https://vitejs.dev) [![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)

## About this Fork

> [!IMPORTANT]
> This fork of Pyright Playground is focused on demonstrating the Pyright - Monaco Editor integration by reducing the code, reorganizing it to reusable parts, and supporting additional features.
>
> You should essentially be able to copy/paste the `LspMonaco` directory and with relative ease integrated them with your own projects.

> [!TIP]
> For an example of how to run Pyright directly on the browser, check out the [BasedPyright Playground](https://github.com/DetachHead/basedpyright-playground/) repository.

```typescript
const monacoLsp = useMonacoLsp({
  initialCode: initialState.code,
  settings: lspSettings,
  apiAddressPrefix: "...",
});
```

🔥 Semantic Tokens support thanks to [basedpyright](https://basedpyright.com/)

![image](https://github.com/user-attachments/assets/6c52637d-3628-4f5e-9216-933bf3b56e40)

---

[Pyright](https://github.com/Microsoft/pyright) is a static type checker for Python.

[Pyright Playground](https://pyright-play.net) provides a web experience for running Pyright.

## Community

Do you have questions about Pyright Playground? Post your questions in [the discussion section](https://github.com/erictraut/pyright-playground/discussions).

To report a bug or request an enhancement for Pyright Playground, file a new issue in the [pyright-playground issue tracker](https://github.com/erictraut/pyright-playground/issues).

To report a bug or request an enhancement for Pyright, file a new issue in the [pyright issue tracker](https://github.com/microsoft/pyright/issues).
