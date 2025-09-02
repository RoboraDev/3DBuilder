// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react,
    },
    rules: {
      semi: ['error', 'always'],               // require semicolons
      quotes: ['error', 'single'],             // enforce double quotes
      indent: ['error', 2],                    // 2 spaces indentation
      'comma-dangle': ['error', 'always-multiline'], // trailing commas
      'object-curly-spacing': ['error', 'always'],   // spacing in {}
      'array-bracket-spacing': ['error', 'never'],   // no space in []
      'keyword-spacing': ['error', { before: true, after: true }], // spacing
      'space-before-blocks': ['error', 'always'],
      'arrow-spacing': ['error', { before: true, after: true }],
      'react/react-in-jsx-scope': 'off',       // no need in React 17+
    },
  },
];