export default {
  verbose: true,
  transform: { '^.+\\.(t|j)sx?$': '@swc/jest' },
  moduleDirectories: ['node_modules', 'src'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
  testPathIgnorePatterns: ['/lib/', '/dist/', '/public/', '/node_modules/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    //   '^jose/(.*)$': '<rootDir>/node_modules/jose/dist/node/cjs/$1',
  },
  setupFiles: ['<rootDir>/src/dotenv/config.ts'],
};
