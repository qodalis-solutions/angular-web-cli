import { baseConfig, buildLibraryOutputConfig } from "../../rollup.shared.mjs";

export default {
  ...baseConfig,
  input: "src/cli-entrypoint.ts",
  external: [...(baseConfig.external || []), "qr-code-styling"],
  output: {
    ...buildLibraryOutputConfig("qr"),
    globals: {
      ...buildLibraryOutputConfig("qr").globals,
      "qr-code-styling": "QRCodeStyling",
    },
  },
};
