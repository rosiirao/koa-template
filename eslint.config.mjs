import typescriptEslint from "@typescript-eslint/eslint-plugin";
import jest from "eslint-plugin-jest";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: ["dist/*", "coverage/*", "**/*.d.ts", "src/public/", "src/types/"],
}, ...compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended"), {
    plugins: {
        "@typescript-eslint": typescriptEslint,
        jest,
    },

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
            ...globals.jest,
            Atomics: "readonly",
            SharedArrayBuffer: "readonly",
        },

        parser: tsParser,
        ecmaVersion: 2018,
        sourceType: "module",
    },

    rules: {
        "@typescript-eslint/no-non-null-assertion": 0,
    },
}];