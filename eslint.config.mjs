import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      'no-restricted-syntax': ['warn', {
        selector: 'NewExpression[callee.name="Date"][arguments.length=1][arguments.0.type="MemberExpression"][arguments.0.property.name=/^(date|start_date|end_date|week_start)$/]',
        message: 'Do not pass .date/.start_date/.end_date to new Date() — UTC midnight shifts the day. Use parseLocalDate() or string comparison instead.',
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
