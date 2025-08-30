/**
 * File utilities for binary detection, file stats, and streaming
 * Provides efficient file processing capabilities
 */
const fs = require('fs').promises;
const fsSyncStreams = require('fs');
const path = require('path');

/**
 * Binary file extensions that should not be processed as text
 */
const BINARY_EXTENSIONS = new Set([
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.svg', '.ico', '.webp',
  '.avif', '.heic', '.heif', '.raw', '.cr2', '.nef', '.orf', '.sr2',
  
  // Video
  '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp', '.ogv',
  
  // Audio
  '.mp3', '.wav', '.aac', '.ogg', '.wma', '.flac', '.m4a', '.opus',
  
  // Archives
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar', '.xz', '.lz4', '.zst',
  
  // Executables
  '.exe', '.dll', '.so', '.dylib', '.bin', '.app', '.deb', '.rpm', '.msi',
  '.dmg', '.pkg', '.snap', '.appimage',
  
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
  
  // Fonts
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  
  // Other binary formats
  '.db', '.sqlite', '.sqlite3', '.pyc', '.class', '.jar', '.war', '.ear',
  '.node', '.wasm', '.o', '.obj', '.lib', '.a'
]);

/**
 * Text file extensions that should definitely be processed as text
 */
const TEXT_EXTENSIONS = new Set([
  // Programming languages
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
  '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.clj', '.hs',
  '.elm', '.dart', '.lua', '.pl', '.pm', '.r', '.m', '.mm', '.f', '.f90', '.f95',
  '.pas', '.asm', '.s', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
  
  // Web technologies
  '.html', '.htm', '.css', '.scss', '.sass', '.less', '.xml', '.xsl', '.xslt',
  '.svg', '.vue', '.svelte', '.astro',
  
  // Data formats
  '.json', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.properties',
  '.env', '.csv', '.tsv', '.sql',
  
  // Documentation
  '.md', '.rst', '.txt', '.rtf', '.tex', '.adoc', '.org',
  
  // Configuration
  '.gitignore', '.gitattributes', '.editorconfig', '.prettierrc', '.eslintrc',
  '.babelrc', '.npmignore', '.dockerignore'
]);

/**
 * Special files that should be treated as text even without extensions
 */
const SPECIAL_TEXT_FILES = new Set([
  'README', 'LICENSE', 'CHANGELOG', 'CONTRIBUTING', 'AUTHORS', 'INSTALL',
  'NEWS', 'TODO', 'COPYING', 'NOTICE', 'MANIFEST', 'VERSION',
  'Dockerfile', 'Makefile', 'Rakefile', 'Gemfile', 'Pipfile', 'requirements.txt',
  '.gitignore', '.gitattributes', '.env', '.env.example', '.env.local',
  '.eslintrc', '.prettierrc', '.babelrc', '.editorconfig'
]);

/**
 * Determines if a file should be treated as text based on its path
 * @param {string} filePath - The file path to check
 * @returns {boolean} True if the file should be treated as text
 */
function isTextFile(filePath) {
  const fileName = path.basename(filePath);
  const extension = path.extname(fileName).toLowerCase();
  
  // Check special files without extensions first
  if (SPECIAL_TEXT_FILES.has(fileName)) {
    return true;
  }
  
  // Check text extensions
  if (TEXT_EXTENSIONS.has(extension)) {
    return true;
  }
  
  // Check binary extensions
  if (BINARY_EXTENSIONS.has(extension)) {
    return false;
  }
  
  // Files without extensions are generally treated as text
  // This covers files like LICENSE, README without extensions
  if (!extension) {
    return true;
  }
  
  // Unknown extensions default to text for safety
  return true;
}

/**
 * Gets file stats efficiently
 * @param {string} filePath - Path to the file
 * @returns {Promise<import('fs').Stats>} File stats
 */
async function getFileStats(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    throw new Error(`Failed to get file stats for ${filePath}: ${error.message}`);
  }
}

/**
 * Reads file content with size limits for memory efficiency
 * @param {string} filePath - Path to the file
 * @param {Object} options - Read options
 * @param {number} options.maxSize - Maximum bytes to read (default 50MB)
 * @param {string} options.encoding - File encoding (default 'utf8')
 * @returns {Promise<{content: string, isComplete: boolean, size: number}>}
 */
async function readFileContent(filePath, options = {}) {
  const { maxSize = 50 * 1024 * 1024, encoding = 'utf8' } = options;
  
  try {
    const stats = await fs.stat(filePath);
    
    // For small files, read completely
    if (stats.size <= maxSize) {
      const content = await fs.readFile(filePath, encoding);
      return {
        content,
        isComplete: true,
        size: stats.size
      };
    }
    
    // For large files, read only the beginning
    return new Promise((resolve, reject) => {
      const stream = fsSyncStreams.createReadStream(filePath, {
        encoding,
        start: 0,
        end: maxSize - 1
      });
      
      let content = '';
      
      stream.on('data', (chunk) => {
        content += chunk;
      });
      
      stream.on('end', () => {
        resolve({
          content,
          isComplete: false,
          size: stats.size
        });
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error.message}`);
  }
}

/**
 * Recursively walks a directory and yields file paths
 * @param {string} dirPath - Directory to walk
 * @yields {string} File paths
 */
async function* walkDirectory(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isFile()) {
        yield fullPath;
      } else if (entry.isDirectory()) {
        // Recursively walk subdirectories
        yield* walkDirectory(fullPath);
      }
    }
  } catch (error) {
    throw new Error(`Failed to walk directory ${dirPath}: ${error.message}`);
  }
}

/**
 * Checks if a path exists and is accessible
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} True if path exists and is accessible
 */
async function exists(filePath) {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a path is a directory
 * @param {string} dirPath - Path to check
 * @returns {Promise<boolean>} True if path is a directory
 */
async function isDirectory(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Normalizes file paths for consistent processing
 * @param {string} filePath - Path to normalize
 * @returns {string} Normalized path
 */
function normalizePath(filePath) {
  return path.resolve(filePath);
}

module.exports = {
  isTextFile,
  getFileStats,
  readFileContent,
  walkDirectory,
  exists,
  isDirectory,
  normalizePath,
  BINARY_EXTENSIONS,
  TEXT_EXTENSIONS,
  SPECIAL_TEXT_FILES
};