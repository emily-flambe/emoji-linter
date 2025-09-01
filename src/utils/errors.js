/**
 * Error handling utilities for emoji-linter
 */

/**
 * File system error with path context
 */
class FileError extends Error {
  constructor(message, filePath, code) {
    super(message);
    this.name = 'FileError';
    this.filePath = filePath;
    this.code = code;
  }
}

/**
 * Validation error for invalid CLI arguments
 */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Format error message with optional colors
 * @param {Error} error - Error to format
 * @param {boolean} useColors - Whether to use colors
 * @returns {string} Formatted error message
 */
function formatError(error, useColors = process.stdout.isTTY) {
  const red = useColors ? '\x1b[31m' : '';
  const reset = useColors ? '\x1b[0m' : '';
  
  let message = `${red}Error: ${error.message}${reset}`;
  
  if (error.filePath) {
    message += `\n  File: ${error.filePath}`;
  }
  
  if (error.code) {
    message += `\n  Code: ${error.code}`;
  }
  
  return message;
}

/**
 * Format success message with optional colors
 * @param {string} message - Success message
 * @param {boolean} useColors - Whether to use colors
 * @returns {string} Formatted success message
 */
function formatSuccess(message, useColors = process.stdout.isTTY) {
  const green = useColors ? '\x1b[32m' : '';
  const reset = useColors ? '\x1b[0m' : '';
  return `${green}✓ ${message}${reset}`;
}

/**
 * Format info message with optional colors
 * @param {string} message - Info message
 * @param {boolean} useColors - Whether to use colors
 * @returns {string} Formatted info message
 */
function formatInfo(message, useColors = process.stdout.isTTY) {
  const blue = useColors ? '\x1b[34m' : '';
  const reset = useColors ? '\x1b[0m' : '';
  return `${blue}ℹ ${message}${reset}`;
}

/**
 * Handle error and exit
 * @param {Error} error - Error to handle
 * @param {boolean} verbose - Show stack trace
 */
function handleError(error, verbose = false) {
  console.error(formatError(error));
  
  if (verbose && error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  
  process.exit(1);
}

module.exports = {
  FileError,
  ValidationError,
  formatError,
  formatSuccess,
  formatInfo,
  handleError
};