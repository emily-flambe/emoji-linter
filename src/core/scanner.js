/**
 * File scanner for emoji-linter
 */

const fs = require('fs');
const path = require('path');

/**
 * File scanner class
 */
class FileScanner {
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
  getFilesRecursive(dir) {
    const files = [];
    
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            files.push(...this.getFilesRecursive(fullPath));
          } else if (stat.isFile()) {
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