import { dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      "jsx-a11y": createRequire(import.meta.url)("eslint-plugin-jsx-a11y"),
    },
    rules: {
      "jsx-a11y/no-noninteractive-element-interactions": "error",
    },
  },
];

export default eslintConfig;
