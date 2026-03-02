import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: [
    'src/content.ts',
    'src/background.ts',
    'src/popup.ts',
  ],
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  target: 'chrome110',
  sourcemap: true,
  minify: !isWatch,
  splitting: false,
  define: {
    'process.env.NODE_ENV': isWatch ? '"development"' : '"production"',
  },
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(buildOptions);
  console.log('Build complete.');
}
