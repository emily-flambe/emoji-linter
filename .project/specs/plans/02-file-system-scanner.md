# Plan 02: File System Scanner

## Scope
Build file system scanning capabilities to recursively process directories and files for emoji detection.

## Dependencies
- **Requires**: Plan 01 (Emoji Detection Engine) completed
- **Provides**: Foundation for CLI tool implementation

## Objectives
- Efficiently scan directories for text files
- Skip binary files automatically  
- Handle file system errors gracefully
- Support glob patterns for file filtering
- Stream processing for large files

## Deliverables

### 1. File Scanner Module (`src/core/scanner.js`)
```javascript
class FileScanner {
  constructor(options)
  scanFiles(paths) // Returns AsyncGenerator of file paths
  scanDirectory(dirPath, options) // Recursive directory scanning
  isTextFile(filePath) // Binary file detection
  readFileContent(filePath) // Safe file reading with streaming
}
```

### 2. File Processing Utils (`src/utils/files.js`)
```javascript
const FileUtils = {
  isBinaryFile(filePath),
  getFileStats(filePath),
  readFileStream(filePath),
  writeFileStream(filePath, content),
  createBackup(filePath)
}
```

### 3. Test Suite (`tests/core/scanner.test.js`)
- Directory traversal testing
- Binary file detection
- Error handling (permissions, missing files)
- Large file processing
- Performance benchmarks

## Implementation Steps

### Step 1: Basic File Reading
```javascript
async readFileContent(filePath) {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size > 50 * 1024 * 1024) { // 50MB limit
      throw new Error(`File too large: ${filePath}`);
    }
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'EISDIR') {
      return null; // Skip directories
    }
    throw new FileProcessingError(`Cannot read ${filePath}: ${error.message}`);
  }
}
```

### Step 2: Binary File Detection
```javascript
isBinaryFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const binaryExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.pdf', '.zip', 
    '.exe', '.bin', '.dll', '.so', '.dylib'
  ];
  return binaryExtensions.includes(ext);
}
```

### Step 3: Directory Traversal  
```javascript
async* scanDirectory(dirPath, options = {}) {
  const { recursive = true, excludePatterns = [] } = options;
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory() && recursive) {
        yield* this.scanDirectory(fullPath, options);
      } else if (entry.isFile()) {
        if (!this.isBinaryFile(fullPath) && !this.shouldExclude(fullPath, excludePatterns)) {
          yield fullPath;
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Cannot access directory ${dirPath}: ${error.message}`);
  }
}
```

### Step 4: Stream Processing for Large Files
```javascript
async processLargeFile(filePath, processor) {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const lines = [];
  let lineNumber = 0;
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      const chunkLines = chunk.split('\n');
      chunkLines.forEach((line, index) => {
        lineNumber++;
        const results = processor(line, lineNumber);
        if (results.length > 0) {
          lines.push(...results);
        }
      });
    });
    
    stream.on('end', () => resolve(lines));
    stream.on('error', reject);
  });
}
```

### Step 5: Error Handling and Recovery
```javascript
class FileProcessingError extends Error {
  constructor(message, filePath, cause) {
    super(message);
    this.name = 'FileProcessingError';
    this.filePath = filePath;
    this.cause = cause;
  }
}
```

## Test Strategy

### Unit Tests Required

1. **File Reading**:
   ```javascript
   test('reads text file content', async () => {
     await fs.writeFile('/tmp/test.txt', 'Hello ✨ World');
     const content = await scanner.readFileContent('/tmp/test.txt');
     expect(content).toBe('Hello ✨ World');
   });
   ```

2. **Binary Detection**:
   ```javascript
   test('detects binary files', () => {
     expect(scanner.isBinaryFile('image.png')).toBe(true);
     expect(scanner.isBinaryFile('script.js')).toBe(false);
   });
   ```

3. **Directory Scanning**:
   ```javascript
   test('scans directory recursively', async () => {
     // Setup test directory structure
     const files = [];
     for await (const file of scanner.scanDirectory('/tmp/test')) {
       files.push(file);
     }
     expect(files).toContain('/tmp/test/src/index.js');
   });
   ```

4. **Error Handling**:
   ```javascript
   test('handles permission errors gracefully', async () => {
     await expect(scanner.readFileContent('/root/secret')).rejects.toThrow(FileProcessingError);
   });
   ```

### Integration Tests
- Real directory structures with mixed file types
- Large file processing (10MB+ files)  
- Permission error scenarios
- Symlink handling
- Network file systems

### Performance Tests
```javascript
test('scans 1000 files under 2 seconds', async () => {
  const start = Date.now();
  const files = [];
  for await (const file of scanner.scanDirectory('/large-codebase')) {
    files.push(file);
  }
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(2000);
  expect(files.length).toBeGreaterThan(1000);
});
```

## Success Criteria

### Functional Requirements
- [ ] Recursively scans directories
- [ ] Skips binary files automatically
- [ ] Handles file system permissions gracefully
- [ ] Supports file filtering patterns
- [ ] Processes files up to 50MB efficiently

### Performance Requirements
- [ ] Scans 1000 files in < 2 seconds
- [ ] Memory usage < 100MB for large directory scans
- [ ] Handles concurrent file access
- [ ] Streams large files without loading entirely into memory

### Quality Requirements
- [ ] 90%+ test coverage
- [ ] All error scenarios tested
- [ ] Cross-platform file handling
- [ ] No file handle leaks

## File Structure Created
```
src/core/scanner.js         # Main scanner implementation
src/utils/files.js          # File utility functions
tests/core/scanner.test.js  # Comprehensive test suite
tests/fixtures/             # Test directory structures
  ├── mixed-files/          # Binary and text files
  ├── large-files/          # Performance test files  
  └── error-cases/          # Permission/access tests
```

## Edge Cases to Handle
- Empty directories
- Symlinks and circular references  
- Files with unusual encodings
- Very long file paths (>260 chars on Windows)
- Network mounted directories
- Files being modified during scan

## Integration Points
- **Input**: File paths from CLI arguments
- **Output**: File content strings to emoji detector
- **Config**: File ignore patterns from configuration system
- **Errors**: Structured error reporting for CLI display

## Definition of Done
- File scanner handles all common file system scenarios
- Performance requirements met on target platforms
- Comprehensive error handling and reporting
- Ready to integrate with emoji detection engine
- Full test coverage with realistic test data