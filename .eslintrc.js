module.exports = {
  root: true,
  extends: [
    "next/core-web-vitals",
    "plugin:tailwindcss/recommended",
    "prettier"
  ],
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "error",
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/exhaustive-deps": "warn",
    "react/no-unescaped-entities": "warn"
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
      parser: '@typescript-eslint/parser',
    },
  ],
  settings: {
    tailwindcss: {
      // Default configuration, you can customize according to your needs
      callees: ["classnames", "clsx", "ctl"],
      config: "tailwind.config.js",
      removeDuplicates: true,
      skipClassAttribute: false,
      whitelist: [],
      // If using Shadcn components, you might want to add their classes to the whitelist
    },
  },
};