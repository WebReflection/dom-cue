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
  }
];
