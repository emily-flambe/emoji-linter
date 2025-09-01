# Plan 03: Increase Test Coverage to 80% (CRITICAL)

## Objective
Increase test coverage from 66.79% to 80% - **Quality requirement for marketplace**

## Time Required
**3-5 hours**

## Current State
- Current: 66.79% (505/756 lines covered)
- Target: 80% (605/756 lines minimum)
- Gap: Need to cover 100+ more lines

## Fastest Path to 80%

### Step 1: Identify Untested Code (30 minutes)

Run coverage report to find gaps:
```bash
npm test -- --coverage
open coverage/lcov-report/index.html
```

Focus on files with lowest coverage first - they give biggest gains.

### Step 2: Add High-Impact Tests (2-3 hours)

Target these areas for maximum coverage increase:

#### Error Handling Tests
Most untested code is error paths. Add tests for:

```javascript
// tests/cli.test.js - Add these test cases
describe('CLI Error Handling', () => {
  test('handles missing config file gracefully', () => {
    // Test when .emoji-linter.config.json doesn't exist
  });

  test('handles invalid JSON in config', () => {
    // Test malformed JSON
  });

  test('handles file permission errors', () => {
    // Test EACCES errors
  });

  test('handles non-existent file paths', () => {
    // Test ENOENT errors
  });
});
```

#### GitHub Action Error Cases
```javascript
// tests/action.test.js - Add these
describe('Action Error Handling', () => {
  test('handles missing github token', () => {
    // Test when token is undefined
  });

  test('handles API rate limiting', () => {
    // Mock 403 response
  });

  test('handles network errors', () => {
    // Mock network timeout
  });
});
```

#### File Utils Edge Cases
```javascript
// tests/utils/files.test.js - Add these
describe('File Utils Edge Cases', () => {
  test('handles empty files', () => {
    // Test zero-byte files
  });

  test('handles files without extension', () => {
    // Test files like 'Makefile'
  });

  test('handles symbolic links', () => {
    // Test symlink handling
  });
});
```

### Step 3: Run Coverage Check (30 minutes)

```bash
# Check we hit 80%
npm test -- --coverage

# If not at 80%, add more tests for uncovered lines
# Focus on: error catches, edge cases, validation failures
```

### Step 4: Add Coverage Threshold (15 minutes)

Update `jest.config.js`:
```javascript
module.exports = {
  // ... existing config
  coverageThreshold: {
    global: {
      lines: 80,
      statements: 80
    }
  }
};
```

This prevents future regressions.

## Quick Test Templates

Use these templates to quickly add coverage:

```javascript
// Template for error handling
test('handles [ERROR TYPE]', () => {
  const mockFn = jest.fn().mockRejectedValue(new Error('[ERROR]'));
  expect(() => functionUnderTest()).not.toThrow();
});

// Template for edge cases  
test('handles [EDGE CASE]', () => {
  const input = [EDGE_CASE_VALUE];
  const result = functionUnderTest(input);
  expect(result).toBeDefined();
});

// Template for validation
test('validates [INPUT]', () => {
  const invalidInput = [INVALID_VALUE];
  expect(() => functionUnderTest(invalidInput)).toThrow();
});
```

## Acceptance Criteria

- [ ] Coverage ≥ 80% when running `npm test -- --coverage`
- [ ] All existing tests still pass
- [ ] Coverage threshold added to jest.config.js
- [ ] No flaky tests introduced

## Tips for Speed

1. **Don't aim for perfection** - Just hit 80%
2. **Focus on error paths** - They're usually untested
3. **Use mock liberally** - Don't test external dependencies
4. **Copy-paste test patterns** - Reuse working test structures
5. **Skip complex scenarios** - Save those for after marketplace launch

## That's it. 80% coverage in 3-5 hours.