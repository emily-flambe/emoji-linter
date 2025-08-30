/**
 * Core FileScanner class for efficient file system scanning
 * Provides text file detection, binary file filtering, and streaming capabilities
 */
const {
  isTextFile,
  getFileStats,
  readFileContent,
  walkDirectory,
  exists,
  isDirectory,
  normalizePath
} = require('../utils/files');

/**
 * Custom error class for file processing errors
 */
class FileProcessingError extends Error {
  /**
   * Creates a new FileProcessingError
   * @param {string} message - Error message
   * @param {string} filePath - Path to the file that caused the error
   * @param {string} [code] - Error code (e.g., 'ENOENT', 'EACCES')
   */
  constructor(message, filePath, code = null) {
    super(message);
    this.name = 'FileProcessingError';
    this.filePath = filePath;
    this.code = code;
  }

  /**
   * Returns a detailed error string
   * @returns {string} Error description with context
   */
  toString() {
    return `${this.name}: ${this.message} (${this.filePath})${this.code ? ` [${this.code}]` : ''}`;
  }
}

/**
 * File scanning result structure
 * @typedef {Object} ScanResult
 * @property {string} filePath - Absolute path to the file
 * @property {string} content - File content (empty for binary files)
 * @property {boolean} isTextFile - Whether the file is detected as text
 * @property {boolean} isComplete - Whether the entire file was read
 * @property {number} size - File size in bytes
 * @property {import('fs').Stats} stats - File system stats
 * @property {FileProcessingError|null} error - Processing error if any
 */

/**
 * FileScanner configuration
 * @typedef {Object} ScannerConfig
 * @property {number} maxFileSize - Maximum file size to read completely (default 50MB)
 * @property {string} encoding - Text file encoding (default 'utf8')
 * @property {Set<string>} [binaryExtensions] - Additional binary extensions
 * @property {Set<string>} [textExtensions] - Additional text extensions
 */

/**
 * High-performance file system scanner with binary detection and streaming
 */
class FileScanner {
  /**
   * Creates a new FileScanner instance
   * @param {ScannerConfig} [config] - Scanner configuration
   */
  constructor(config = {}) {
    this.config = {
      maxFileSize: 50 * 1024 * 1024, // 50MB default
      encoding: 'utf8',
      ...config
    };
  }

  /**
   * Determines if a file should be treated as text based on its path
   * @param {string} filePath - The file path to check
   * @returns {boolean} True if the file should be treated as text
   */
  isTextFile(filePath) {
    return isTextFile(filePath);
  }

  /**
   * Reads file content with memory efficiency considerations
   * @param {string} filePath - Path to the file to read
   * @returns {Promise<{content: string, isComplete: boolean, size: number, stats: import('fs').Stats}>}
   */
  async readFileContent(filePath) {
    const normalizedPath = normalizePath(filePath);
    
    try {
      // Check if file exists first
      if (!(await exists(normalizedPath))) {
        throw new FileProcessingError(
          `File not found: ${normalizedPath}`,
          normalizedPath,
          'ENOENT'
        );
      }

      // Get file stats
      const stats = await getFileStats(normalizedPath);
      
      // Read file content with size limits
      const { content, isComplete, size } = await readFileContent(normalizedPath, {
        maxSize: this.config.maxFileSize,
        encoding: this.config.encoding
      });

      return {
        content,
        isComplete,
        size,
        stats
      };
    } catch (error) {
      // Wrap system errors in FileProcessingError
      if (error instanceof FileProcessingError) {
        throw error;
      }
      
      const errorCode = error.code || 'UNKNOWN';
      throw new FileProcessingError(
        `Failed to read file: ${error.message}`,
        normalizedPath,
        errorCode
      );
    }
  }

  /**
   * Scans multiple files and yields results as an async generator
   * @param {string[]} filePaths - Array of file paths to scan
   * @yields {ScanResult} Scan results for each file
   */
  async* scanFiles(filePaths) {
    for (const filePath of filePaths) {
      const normalizedPath = normalizePath(filePath);
      const result = {
        filePath: normalizedPath,
        content: '',
        isTextFile: this.isTextFile(normalizedPath),
        isComplete: false,
        size: 0,
        stats: null,
        error: null
      };

      try {
        // Skip binary files - don't read content but provide metadata
        if (!result.isTextFile) {
          // Still get file stats for binary files
          if (await exists(normalizedPath)) {
            result.stats = await getFileStats(normalizedPath);
            result.size = result.stats.size;
            result.isComplete = true; // Binary files are "complete" without reading content
          } else {
            throw new FileProcessingError(
              `File not found: ${normalizedPath}`,
              normalizedPath,
              'ENOENT'
            );
          }
        } else {
          // Read text file content
          const fileData = await this.readFileContent(normalizedPath);
          result.content = fileData.content;
          result.isComplete = fileData.isComplete;
          result.size = fileData.size;
          result.stats = fileData.stats;
        }
      } catch (error) {
        // Store error but continue processing other files
        if (error instanceof FileProcessingError) {
          result.error = error;
        } else {
          result.error = new FileProcessingError(
            `Unexpected error: ${error.message}`,
            normalizedPath,
            error.code
          );
        }
      }

      yield result;
    }
  }

  /**
   * Recursively scans a directory and yields results as an async generator
   * @param {string} dirPath - Directory path to scan
   * @yields {ScanResult} Scan results for each file found
   */
  async* scanDirectory(dirPath) {
    const normalizedPath = normalizePath(dirPath);
    
    try {
      // Validate directory exists
      if (!(await exists(normalizedPath))) {
        throw new FileProcessingError(
          `Directory not found: ${normalizedPath}`,
          normalizedPath,
          'ENOENT'
        );
      }

      // Validate it's actually a directory
      if (!(await isDirectory(normalizedPath))) {
        throw new FileProcessingError(
          `Path is not a directory: ${normalizedPath}`,
          normalizedPath,
          'ENOTDIR'
        );
      }

      // Walk directory and process files
      const filePaths = [];
      
      try {
        for await (const filePath of walkDirectory(normalizedPath)) {
          filePaths.push(filePath);
        }
      } catch (error) {
        throw new FileProcessingError(
          `Failed to read directory: ${error.message}`,
          normalizedPath,
          error.code || 'EACCES'
        );
      }

      // Process all found files
      yield* this.scanFiles(filePaths);
      
    } catch (error) {
      if (error instanceof FileProcessingError) {
        throw error;
      }
      
      throw new FileProcessingError(
        `Directory scan failed: ${error.message}`,
        normalizedPath,
        error.code || 'UNKNOWN'
      );
    }
  }

  /**
   * Gets scanner configuration
   * @returns {ScannerConfig} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Updates scanner configuration
   * @param {Partial<ScannerConfig>} newConfig - Configuration updates
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets performance statistics for the scanner
   * @returns {Object} Performance metrics
   */
  getPerformanceStats() {
    return {
      maxFileSize: this.config.maxFileSize,
      encoding: this.config.encoding,
      memoryEfficient: true,
      streamingEnabled: true
    };
  }
}

module.exports = {
  FileScanner,
  FileProcessingError
};