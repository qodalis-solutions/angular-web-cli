import typescript from "rollup-plugin-typescript2";

export const baseConfig = {
  plugins: [
    typescript({
      useTsconfigDeclarationDir: true, // Use the declaration folder specified in tsconfig
      clean: true, // Remove previous caches
    }),
  ],
  external: ["@qodalis/cli-core", "@angular/core"],
};

export const sharedGlobals = {
  "@qodalis/cli-core": "cliCore",
  "@angular/core": "ngCore",
};

export const buildLibraryOutputConfig = (libName) => {
  return {
    file: `../../dist/${libName}/umd/index.js`,
    format: "umd",
    name: libName,
    globals: {
      ...sharedGlobals,
    },
  };
};
