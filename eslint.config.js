import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

export default [
  { ignores: ["dist/**", "android/**"] },
  { languageOptions: { globals: globals.browser } },
  ...tseslint.configs.recommended,
  { plugins: { react: pluginReact } },
  {
    rules: {
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_", 
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
