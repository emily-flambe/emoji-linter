/**
 * Default configuration for emoji-linter
 */

const DEFAULT_CONFIG = {
  ignore: {
    files: [],
    emojis: [],
    patterns: []
  },
  detection: {
    unicode: true,
    shortcodes: true,
    sequences: true,
    skinTones: true
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
};

module.exports = {
  DEFAULT_CONFIG
};