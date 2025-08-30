/**
 * CLI Error Classes for emoji-linter
 * Provides comprehensive error handling for CLI operations
 */

/* eslint-disable no-console */

/**
 * Base CLI error class
 */
class CLIError extends Error {
  /**
   * Creates a new CLIError
   * @param {string} message - Error message
   * @param {number} [exitCode=1] - Process exit code
   */
  constructor(message, exitCode = 1) {
    super(message);
    this.name = 'CLIError';
    this.exitCode = exitCode;
  }

  /**
   * Returns formatted error message for CLI display
   * @returns {string} Formatted error message
   */
  toDisplayString() {
    return `Error: ${this.message}`;
  }
}

/**
 * Validation error for invalid CLI arguments or options
 */
class ValidationError extends CLIError {
  /**
   * Creates a new ValidationError
   * @param {string} message - Error message
   * @param {string} [parameter] - Parameter name that caused the error
   */
  constructor(message, parameter = null) {
    super(message, 1);
    this.name = 'ValidationError';
    this.parameter = parameter;
  }

  /**
   * Returns formatted error message for CLI display
   * @returns {string} Formatted error message
   */
  toDisplayString() {
    const base = `Validation Error: ${this.message}`;
    return this.parameter ? `${base} (parameter: ${this.parameter})` : base;
  }
}

/**
 * File operation error for file system issues
 */
class FileError extends CLIError {
  /**
   * Creates a new FileError
   * @param {string} message - Error message
   * @param {string} filePath - Path to the file that caused the error
   * @param {string} [code] - System error code (e.g., 'ENOENT', 'EACCES')
   * @param {number} [exitCode=1] - Process exit code
   */
  constructor(message, filePath, code = null, exitCode = 1) {
    super(message, exitCode);
    this.name = 'FileError';
    this.filePath = filePath;
    this.code = code;
  }

  /**
   * Returns formatted error message for CLI display
   * @returns {string} Formatted error message
   */
  toDisplayString() {
    let display = `File Error: ${this.message}`;
    
    if (this.filePath) {
      display += ` (${this.filePath})`;
    }
    
    if (this.code) {
      display += ` [${this.code}]`;
    }
    
    return display;
  }

  /**
   * Returns user-friendly error message based on error code
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
      return this.toDisplayString();
    }
  }
}

/**
 * Configuration error for config file issues
 */
class ConfigError extends CLIError {
  /**
   * Creates a new ConfigError
   * @param {string} message - Error message
   * @param {string} [configPath] - Path to the config file
   */
  constructor(message, configPath = null) {
    super(message, 1);
    this.name = 'ConfigError';
    this.configPath = configPath;
  }

  /**
   * Returns formatted error message for CLI display
   * @returns {string} Formatted error message
   */
  toDisplayString() {
    let display = `Configuration Error: ${this.message}`;
    
    if (this.configPath) {
      display += ` (${this.configPath})`;
    }
    
    return display;
  }
}

/**
 * Output formatting error
 */
class OutputError extends CLIError {
  /**
   * Creates a new OutputError
   * @param {string} message - Error message
   * @param {string} [format] - Output format that caused the error
   */
  constructor(message, format = null) {
    super(message, 1);
    this.name = 'OutputError';
    this.format = format;
  }

  /**
   * Returns formatted error message for CLI display
   * @returns {string} Formatted error message
   */
  toDisplayString() {
    let display = `Output Error: ${this.message}`;
    
    if (this.format) {
      display += ` (format: ${this.format})`;
    }
    
    return display;
  }
}

/**
 * Processing error for emoji detection/processing issues
 */
class ProcessingError extends CLIError {
  /**
   * Creates a new ProcessingError
   * @param {string} message - Error message
   * @param {string} [filePath] - File being processed when error occurred
   * @param {number} [lineNumber] - Line number where error occurred
   */
  constructor(message, filePath = null, lineNumber = null) {
    super(message, 1);
    this.name = 'ProcessingError';
    this.filePath = filePath;
    this.lineNumber = lineNumber;
  }

  /**
   * Returns formatted error message for CLI display
   * @returns {string} Formatted error message
   */
  toDisplayString() {
    let display = `Processing Error: ${this.message}`;
    
    if (this.filePath) {
      display += ` (${this.filePath}`;
      
      if (this.lineNumber) {
        display += `:${this.lineNumber}`;
      }
      
      display += ')';
    }
    
    return display;
  }
}

/**
 * Error handler utility functions
 */
class ErrorHandler {
  /**
   * Format error for console display with colors (if supported)
   * @param {Error} error - The error to format
   * @param {boolean} [useColors=true] - Whether to use color formatting
   * @returns {string} Formatted error message
   */
  static formatError(error, useColors = true) {
    if (error instanceof CLIError) {
      const message = error.toDisplayString();
      return useColors ? `\x1b[31m${message}\x1b[0m` : message;
    }
    
    const message = `Error: ${error.message}`;
    return useColors ? `\x1b[31m${message}\x1b[0m` : message;
  }

  /**
   * Format warning for console display
   * @param {string} message - Warning message
   * @param {boolean} [useColors=true] - Whether to use color formatting
   * @returns {string} Formatted warning message
   */
  static formatWarning(message, useColors = true) {
    const warning = `Warning: ${message}`;
    return useColors ? `\x1b[33m${warning}\x1b[0m` : warning;
  }

  /**
   * Format success message for console display
   * @param {string} message - Success message
   * @param {boolean} [useColors=true] - Whether to use color formatting
   * @returns {string} Formatted success message
   */
  static formatSuccess(message, useColors = true) {
    return useColors ? `\x1b[32m${message}\x1b[0m` : message;
  }

  /**
   * Format info message for console display
   * @param {string} message - Info message
   * @param {boolean} [useColors=true] - Whether to use color formatting
   * @returns {string} Formatted info message
   */
  static formatInfo(message, useColors = true) {
    return useColors ? `\x1b[36m${message}\x1b[0m` : message;
  }

  /**
   * Handle CLI error and exit process
   * @param {Error} error - The error to handle
   * @param {boolean} [verbose=false] - Whether to show stack trace
   * @param {boolean} [useColors=true] - Whether to use color formatting
   */
  static handleError(error, verbose = false, useColors = true) {
    const formatted = this.formatError(error, useColors);
    console.error(formatted);
    
    if (verbose && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    // Provide helpful suggestions for common errors
    if (error instanceof FileError && error.code === 'ENOENT') {
      console.error(this.formatInfo('\nTip: Check if the file path is correct and the file exists.', useColors));
    } else if (error instanceof FileError && error.code === 'EACCES') {
      console.error(this.formatInfo('\nTip: Check file permissions or run with appropriate privileges.', useColors));
    } else if (error instanceof ValidationError) {
      console.error(this.formatInfo('\nRun with --help to see usage instructions.', useColors));
    } else if (error instanceof ConfigError) {
      console.error(this.formatInfo('\nTip: Check your configuration file syntax and structure.', useColors));
    }
    
    const exitCode = error instanceof CLIError ? error.exitCode : 1;
    process.exit(exitCode);
  }

  /**
   * Create error from Node.js system error
   * @param {Error} systemError - Node.js system error
   * @param {string} [filePath] - File path context
   * @returns {CLIError} Appropriate CLI error
   */
  static fromSystemError(systemError, filePath = null) {
    const { code, message } = systemError;
    
    switch (code) {
    case 'ENOENT':
    case 'EACCES':
    case 'EISDIR':
    case 'ENOTDIR':
    case 'EMFILE':
    case 'ENFILE':
    case 'ENOSPC':
    case 'EROFS':
      return new FileError(message, filePath, code);
      
    default:
      return new CLIError(`System error: ${message} ${code ? `(${code})` : ''}`.trim());
    }
  }

  /**
   * Wrap async function with error handling
   * @param {Function} fn - Async function to wrap
   * @param {boolean} [verbose=false] - Whether to show verbose errors
   * @returns {Function} Wrapped function
   */
  static wrapAsync(fn, verbose = false) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError(error, verbose);
      }
    };
  }

  /**
   * Check if colors should be used in terminal
   * @returns {boolean} True if colors should be used
   */
  static shouldUseColors() {
    // Check common environment variables for color support
    if (process.env.NO_COLOR) {
      return false;
    }
    
    if (process.env.FORCE_COLOR) {
      return true;
    }
    
    // Check if terminal supports colors
    return process.stdout.isTTY && process.stdout.hasColors && process.stdout.hasColors();
  }
}

module.exports = {
  CLIError,
  ValidationError,
  FileError,
  ConfigError,
  OutputError,
  ProcessingError,
  ErrorHandler
};