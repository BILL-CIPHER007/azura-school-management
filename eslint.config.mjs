import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"]
  },
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off"
    }
  }
];

export default eslintConfig;
