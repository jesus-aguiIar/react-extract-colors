# Testing the hook

Run `npm ci` followed by `npm test -- --coverage`. The test script builds the package before Vitest starts. CI also runs `npm run typecheck`.

- The hook tests render React components in jsdom. Controlled image events and pixel buffers let a test finish requests in either order and exercise errors without a network connection.
- The package tests install the output of `npm pack` into a temporary consumer. Node loads the public ESM and CommonJS entries, and TypeScript checks the consumer fixtures with its own resolver. Local runs reuse the installed React peers. CI installs React 17 and 19 in its consumers.
- Cases marked `test.fails` reproduce known bugs and assert the intended behavior. When a fix makes a case pass, Vitest reports an unexpected pass. Remove the corresponding `.fails` in the same change to keep the case as a regression test.
