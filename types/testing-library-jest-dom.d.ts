// jest-dom matcher augmentation for packages whose tests use toBeInTheDocument
// etc. Runtime setup lives in test-setup/dom.ts (injected by
// createSharedVitestConfig); this type-side import must live outside
// packages/*/src because the lint chain removes stray .d.ts artifacts there
// (word-editor-renderers tsconfig includes ../../types/**/*.d.ts).
import '@testing-library/jest-dom/vitest';
