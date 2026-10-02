import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

/**
 * Configuración de lint del monorepo.
 *
 * Se apoya en las reglas recomendadas de TypeScript sin exigir información de
 * tipos, de modo que `npm run lint` sea rápido. La verificación de tipos la hace
 * `tsc --noEmit` en cada proyecto, que es más estricta y ya está en los scripts.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.config.{js,mjs,ts}',
      'apps/api/src/prisma/migrations/**',
      // Lo genera Next en cada build.
      'apps/web/next-env.d.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      // El código usa `any` en puntos acotados (transacciones de Prisma, errores
      // de red). Avisar sin romper la build.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Los scripts de semilla y de datos de demo sí escriben por consola.
  {
    files: ['apps/api/prisma/**/*.ts'],
    rules: { 'no-console': 'off' },
  },

  // El arranque del servidor informa por consola a propósito.
  {
    files: ['apps/api/src/main.ts'],
    rules: { 'no-console': 'off' },
  },

  // Las reglas de los hooks de React en la aplicación web.
  {
    files: ['apps/web/**/*.{ts,tsx}', 'packages/ui/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Las pruebas usan los globales de Jest y a veces reimportan un módulo
  // con el entorno ya modificado, para lo que `require` es lo natural.
  {
    files: ['**/*.spec.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
  },

  // Prettier va al final: desactiva las reglas que chocan con el formateo.
  prettier,
);
