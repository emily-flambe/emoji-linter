/**
 * Utilities for parsing inline ignore comments
 */

/**
 * Regular expressions for different comment styles
 */
const IGNORE_PATTERNS = {
  // Line comments: // emoji-linter-disable
  LINE_COMMENT: /\/\/\s*emoji-linter-disable(?:-line)?/i,
  
  // Block comments: /* emoji-linter-disable */
  BLOCK_COMMENT: /\/\*\s*emoji-linter-disable(?:-line)?\s*\*\//i,
  
  // Hash comments: # emoji-linter-disable
  HASH_COMMENT: /#\s*emoji-linter-disable(?:-line)?/i,
  
  // HTML comments: <!-- emoji-linter-disable -->
  HTML_COMMENT: /<!--\s*emoji-linter-disable(?:-line)?\s*-->/i
};

/**
 * File-level ignore patterns
 */
const FILE_IGNORE_PATTERNS = {
  LINE_COMMENT: /\/\/\s*emoji-linter-disable-file/i,
  BLOCK_COMMENT: /\/\*\s*emoji-linter-disable-file\s*\*\//i,
  HASH_COMMENT: /#\s*emoji-linter-disable-file/i,
  HTML_COMMENT: /<!--\s*emoji-linter-disable-file\s*-->/i
};

/**
 * Check if a line contains an inline ignore comment
 * @param {string} line - The line to check
 * @returns {boolean} True if the line should be ignored
 */
function shouldIgnoreLine(line) {
  if (typeof line !== 'string') {
    return false;
  }

  // Check all ignore patterns
  for (const pattern of Object.values(IGNORE_PATTERNS)) {
    if (pattern.test(line)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if file content contains a file-level ignore comment
 * @param {string} content - The file content to check
 * @returns {boolean} True if the entire file should be ignored
 */
function shouldIgnoreFile(content) {
  if (typeof content !== 'string') {
    return false;
  }

  // Check first few lines for file-level ignore comments
  const lines = content.split('\n').slice(0, 10); // Check first 10 lines
  
  for (const line of lines) {
    for (const pattern of Object.values(FILE_IGNORE_PATTERNS)) {
      if (pattern.test(line)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Parse ignore comments from content and return line numbers to ignore
 * @param {string} content - The file content
 * @returns {Set<number>} Set of line numbers to ignore (1-based)
 */
function parseIgnoreComments(content) {
  const ignoredLines = new Set();
  
  if (typeof content !== 'string') {
    return ignoredLines;
  }

  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    if (shouldIgnoreLine(line)) {
      ignoredLines.add(index + 1); // Convert to 1-based line numbers
    }
  });

  return ignoredLines;
}

module.exports = {
  shouldIgnoreLine,
  shouldIgnoreFile,
  parseIgnoreComments,
  IGNORE_PATTERNS,
  FILE_IGNORE_PATTERNS
};