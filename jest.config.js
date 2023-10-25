// module.exports = {
//     "roots": [
//         "<rootDir>/tests"
//     ],
//     "transform": {
//         "^.+\\.ts$": "ts-jest"
//     }
// }

/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts?$',
    // moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    // collectCoverage: true,
    // clearMocks: true,
    transformIgnorePatterns: ["node_modules/(?!@ngrx|(?!deck.gl)|ng-dynamic)"]
};
