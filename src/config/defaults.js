/**
 * Default configuration for emoji-linter
 */

// Simplified config - removed unnecessary complexity!
const DEFAULT_CONFIG = {
  ignore: {
    files: [
      '**/*.md',
      'docs/**',
      '**/node_modules/**',
      '.git/**',
      'dist/**',
      'build/**'
    ],
    emojis: [], // Can still ignore specific emojis if needed
    patterns: []
  },
  output: {
    format: 'table',
    showContext: true,
    maxContextLines: 2
  },
  cleanup: {
    preserveWhitespace: false,
    createBackup: false
  }
  // Removed detection config - it's just hardcoded now!
  // Unicode: always true, shortcodes: removed, sequences/skinTones: part of Unicode
};

module.exports = {
  DEFAULT_CONFIG
};