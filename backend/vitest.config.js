const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
    test: {
        environment: "node",
        globals: true,
        include: ["tests/**/*.test.js"],
        coverage: {
            provider: "v8",
            reporter: ["text", "lcov"],
            include: ["src/services/saved-articles.service.js"],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 80,
                statements: 80,
            },
        },
    },
});
