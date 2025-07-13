import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import reactHooks from "eslint-plugin-react-hooks";
import noNestedInteractive from "./eslint-rules/no-nested-interactive.js";

const customPlugin = {
  rules: {
    'no-nested-interactive': noNestedInteractive,
  },
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "plugin:jsx-a11y/recommended",
    "plugin:react-hooks/recommended"
  ),
  {
    plugins: { custom: customPlugin, "react-hooks": reactHooks },
    rules: {
      "jsx-a11y/no-noninteractive-element-interactions": "error",
      "custom/no-nested-interactive": "error",
    },
    ignores: [
      "src/convex/_generated/**"
    ],
  },
];

export default eslintConfig;
