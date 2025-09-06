/**
 * File scanner for emoji-linter
 */

const fs = require('fs');
const path = require('path');

/**
 * File scanner class
 */
class FileScanner {
  constructor(config = null) {
    this.config = config;
    if (process.env.DEBUG_IGNORE && this.config) {
      console.log('Scanner initialized with config:', this.config.config.ignore?.files?.length || 0, 'ignore patterns');
    }
  }

  /**
   * Scan files for processing
   * @param {Array} files - Array of file paths
   * @returns {AsyncGenerator} Yields scan results
   */
  async *scanFiles(files) {
    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        yield {
          filePath,
          content,
          size: Buffer.byteLength(content, 'utf8'),
          isTextFile: true,
          isComplete: true,
          error: null
        };
      } catch (error) {
        yield {
          filePath,
          content: null,
          size: 0,
          isTextFile: false,
          isComplete: false,
          error
        };
      }
    }
  }

  /**
   * Scan directory for files
   * @param {string} dir - Directory path
   * @returns {AsyncGenerator} Yields file paths
   */
  async *scanDirectory(dir) {
    const files = this.getFilesRecursive(dir);
    for (const file of files) {
      yield { filePath: file, error: null };
    }
  }

  /**
   * Get all files recursively
   * @param {string} dir - Directory path
   * @returns {Array} Array of file paths
   */
  getFilesRecursive(dir, depth = 0) {
    const files = [];
    
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        let fullPath = path.join(dir, item);
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            // Check if this directory should be skipped using config
            if (this.config && this.config.shouldIgnoreDirectory(fullPath)) {
              if (process.env.DEBUG_IGNORE) {
                console.log(`Skipping directory: ${fullPath}`);
              }
              continue;
            }
            
            files.push(...this.getFilesRecursive(fullPath, depth + 1));
          } else if (stat.isFile()) {
            // Skip files that match ignore patterns
            if (this.config && this.config.shouldIgnoreFile(fullPath)) {
              continue;
            }
            files.push(fullPath);
          }
        } catch (error) {
          // Skip files we can't access
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    
    return files;
  }
}

module.exports = { FileScanner };