import terser from '@rollup/plugin-terser';

export default [
  {
    plugins: [terser()],
    input: './src/index.js',
    output: {
      esModule: true,
      file: './dist/index.js',
    }
  },
  {
    plugins: [terser()],
    input: './src/listener.js',
    output: {
      esModule: true,
      file: './dist/listener.js',
    }
  },
  {
    plugins: [terser()],
    input: './src/nested.js',
    output: {
      esModule: true,
      file: './dist/nested.js',
    }
  },
  {
    plugins: [terser()],
    input: './src/nested-listener.js',
    output: {
      esModule: true,
      file: './dist/nested-listener.js',
    }
  }
];
