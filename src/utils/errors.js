/**
 * Simplified error handling for emoji-linter CLI
 * Replaces 367-line complex hierarchy with focused, simple approach
 */

/* eslint-disable no-console */

/**
 * File operation error - the only custom error we actually need
 * Handles system errors like ENOENT, EACCES, etc.
 */
class FileError extends Error {
  /**
   * Creates a new FileError
   * @param {string} message - Error message
   * @param {string} filePath - Path to the file that caused the error
   * @param {string} [code] - System error code (e.g., 'ENOENT', 'EACCES')
   */
  constructor(message, filePath, code = null) {
    super(message);
    this.name = 'FileError';
    this.filePath = filePath;
    this.code = code;
  }

  /**
   * Get user-friendly error message
   * @returns {string} User-friendly message
   */
  getFriendlyMessage() {
    switch (this.code) {
    case 'ENOENT':
      return `File or directory not found: ${this.filePath}`;
    case 'EACCES':
      return `Permission denied: ${this.filePath}`;
    case 'EISDIR':
      return `Expected file but found directory: ${this.filePath}`;
    case 'ENOTDIR':
      return `Expected directory but found file: ${this.filePath}`;
    case 'EMFILE':
    case 'ENFILE':
      return 'Too many files open. Try processing fewer files at once.';
    case 'ENOSPC':
      return `No space left on device when writing to: ${this.filePath}`;
    case 'EROFS':
      return `Read-only file system: ${this.filePath}`;
    default:
      return `File error: ${this.message} (${this.filePath})`;
    }
  }
}

/**
 * Simple error formatting - handles colors if terminal supports them
 * @param {Error} error - The error to format
 * @returns {string} Formatted error message
 */
function formatError(error) {
  const useColors = shouldUseColors();
  const red = useColors ? '\x1b[31m' : '';
  const reset = useColors ? '\x1b[0m' : '';
  
  let message;
  if (error instanceof FileError) {
    message = error.getFriendlyMessage();
  } else {
    message = `Error: ${error.message}`;
  }
  
  return `${red}${message}${reset}`;
}

/**
 * Simple warning formatting
 * @param {string} message - Warning message
 * @returns {string} Formatted warning message
 */
function formatWarning(message) {
  const useColors = shouldUseColors();
  const yellow = useColors ? '\x1b[33m' : '';
  const reset = useColors ? '\x1b[0m' : '';
  return `${yellow}Warning: ${message}${reset}`;
}

/**
 * Simple success formatting
 * @param {string} message - Success message
 * @returns {string} Formatted success message
 */
function formatSuccess(message) {
  const useColors = shouldUseColors();
  const green = useColors ? '\x1b[32m' : '';
  const reset = useColors ? '\x1b[0m' : '';
  return `${green}${message}${reset}`;
}

/**
 * Simple info formatting
 * @param {string} message - Info message
 * @returns {string} Formatted info message
 */
function formatInfo(message) {
  const useColors = shouldUseColors();
  const cyan = useColors ? '\x1b[36m' : '';
  const reset = useColors ? '\x1b[0m' : '';
  return `${cyan}${message}${reset}`;
}

/**
 * Handle error and exit
 * @param {Error} error - The error to handle
 * @param {boolean} [verbose=false] - Whether to show stack trace
 */
function handleError(error, verbose = false) {
  console.error(formatError(error));
  
  if (verbose && error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  
  // Helpful tips for common errors
  if (error instanceof FileError) {
    if (error.code === 'ENOENT') {
      console.error(formatInfo('\nTip: Check if the file path is correct and the file exists.'));
    } else if (error.code === 'EACCES') {
      console.error(formatInfo('\nTip: Check file permissions or run with appropriate privileges.'));
    }
  } else if (error.message.includes('validation') || error.message.includes('invalid')) {
    console.error(formatInfo('\nRun with --help to see usage instructions.'));
  } else if (error.message.includes('config')) {
    console.error(formatInfo('\nTip: Check your configuration file syntax and structure.'));
  }
  
  process.exit(1);
}

/**
 * Create FileError from Node.js system error
 * @param {Error} systemError - Node.js system error
 * @param {string} [filePath] - File path context
 * @returns {FileError|Error} Appropriate error
 */
function fromSystemError(systemError, filePath = null) {
  const { code, message } = systemError;
  
  const systemCodes = ['ENOENT', 'EACCES', 'EISDIR', 'ENOTDIR', 'EMFILE', 'ENFILE', 'ENOSPC', 'EROFS'];
  if (systemCodes.includes(code)) {
    return new FileError(message, filePath, code);
  }
  
  return new Error(`System error: ${message} ${code ? `(${code})` : ''}`.trim());
}

/**
 * Check if colors should be used in terminal
 * @returns {boolean} True if colors should be used
 */
function shouldUseColors() {
  // Check environment variables
  if (process.env.NO_COLOR) {
    return false;
  }
  
  if (process.env.FORCE_COLOR) {
    return true;
  }
  
  // Check if terminal supports colors
  return process.stdout.isTTY;
}

module.exports = {
  FileError,
  formatError,
  formatWarning,
  formatSuccess,
  formatInfo,
  handleError,
  fromSystemError
};