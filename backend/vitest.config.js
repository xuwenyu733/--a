export default {
  test: {
    include: ['tests/**/*.test.js', '../shared/**/*.test.js'],
    exclude: ['tests/**/*.integration.test.js'],
    environment: 'node',
    hookTimeout: 60000,
    testTimeout: 30000,
    globalTeardown: './tests/helpers/globalTeardown.js',
  },
}
