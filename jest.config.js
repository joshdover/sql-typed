module.exports = {
  roots: ["<rootDir>/src"],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  reporters: process.env.CI
    ? ["default", ["jest-junit", { outputDirectory: "test-results" }]]
    : ["default"],
  globals: {
    "ts-jest": {
      diagnostics: {
        ignoreCodes: [6133]
      }
    }
  }
};
