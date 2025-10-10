import terser from '@rollup/plugin-terser';

export default [
  {
    plugins: [terser()],
    input: './index.js',
    output: {
      esModule: true,
      file: './dist.js',
    }
  },
];
