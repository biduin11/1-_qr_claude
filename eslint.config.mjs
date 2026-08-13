import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // public/sw.js — сгенерированный serwist-бандл (`next build --webpack`,
    // см. ARCHITECTURE.md §9), не исходный код.
    ignores: ["node_modules/**", ".next/**", "dist/**", "public/sw.js", "public/swe-worker-*.js"],
  },
];

export default eslintConfig;
