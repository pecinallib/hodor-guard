import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/middleware/hodorGuard.ts',
    router: 'src/router/statsRouter.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  outDir: 'dist',
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    };
  },
});
