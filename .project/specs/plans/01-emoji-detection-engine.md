# Plan 01: Emoji Detection Engine

## Scope
Build the core emoji detection engine - the foundation component that all other features depend on.

## Objectives
- Accurately detect all emoji types (Unicode, sequences, shortcodes, skin tones)
- Provide structured information about detected emojis
- Pure functions for easy testing
- Performance optimized for large text processing

## Deliverables

### 1. Core Detection Module (`src/core/detector.js`)
```javascript
class EmojiDetector {
  constructor(config)
  findEmojis(text, lineNumber) // Returns array of emoji objects
  removeEmojis(text) // Returns text with emojis removed
  hasEmojis(text) // Fast boolean check
}
```

### 2. Regex Patterns (`src/utils/patterns.js`)  
```javascript
const PATTERNS = {
  UNICODE_EMOJI: /\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu,
  SHORTCODE_EMOJI: /:[a-zA-Z0-9_+-]+:/g,
  EMOJI_SEQUENCES: /\p{Emoji}(\p{EMod}|\u200D\p{Emoji})*/gu
}
```

### 3. Comprehensive Test Suite (`tests/core/detector.test.js`)
- Test all emoji categories: basic, sequences, skin tones, shortcodes
- Edge cases: empty strings, large texts, malformed input
- Performance benchmarks: 1MB text processing under 100ms
- False positive/negative validation

## Implementation Steps

### Step 1: Research and Pattern Development
- Research Unicode 15.1 emoji specifications
- Create comprehensive regex patterns for all emoji types
- Document pattern rationale and coverage

### Step 2: Basic Detection Implementation  
```javascript
// Start with simple Unicode detection
findEmojis(text) {
  const matches = [];
  const regex = /\p{Emoji_Presentation}/gu;
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      emoji: match[0],
      start: match.index,
      end: match.index + match[0].length,
      type: 'unicode'
    });
  }
  return matches;
}
```

### Step 3: Expand to All Emoji Types
- Add shortcode detection (`:rocket:`)
- Add emoji sequences (👨‍💻, 🏳️‍🌈)  
- Add skin tone modifiers
- Add ZWJ sequences

### Step 4: Removal Functionality
```javascript
removeEmojis(text) {
  return text
    .replace(PATTERNS.EMOJI_SEQUENCES, '')
    .replace(PATTERNS.UNICODE_EMOJI, '')
    .replace(PATTERNS.SHORTCODE_EMOJI, '')
    .replace(/\s+/g, ' ')
    .trim();
}
```

### Step 5: Performance Optimization
- Lazy regex compilation
- Early termination for hasEmojis()
- Memory efficient processing for large strings

## Test Strategy

### Unit Tests Required
1. **Basic Detection**:
   ```javascript
   expect(detector.findEmojis('Hello ✨')).toHaveLength(1);
   expect(detector.findEmojis('Hello ✨')[0].emoji).toBe('✨');
   ```

2. **Emoji Types**:
   - Unicode: ✨ 🚀 📝 ❤️
   - Sequences: 👨‍💻 🏳️‍🌈 👨‍👩‍👧‍👦
   - Shortcodes: :rocket: :sparkles: :heart:
   - Skin tones: 👋🏻 👋🏿 🤝🏽

3. **Edge Cases**:
   - Empty strings: `''`
   - Only emojis: `'✨🚀📝'`
   - Mixed content: `'Code ✨ and bugs 🐛'`
   - Large text: 10MB+ files

4. **Performance**:
   - 1KB text: < 1ms
   - 1MB text: < 100ms  
   - Memory usage: < 50MB for 10MB text

### Test Data Sets
```javascript
const TEST_EMOJIS = {
  unicode: ['✨', '🚀', '📝', '❤️', '🎉', '🔥'],
  sequences: ['👨‍💻', '🏳️‍🌈', '👨‍👩‍👧‍👦', '🤝🏽'],
  shortcodes: [':rocket:', ':sparkles:', ':heart:', ':fire:'],
  skinTones: ['👋🏻', '👋🏼', '👋🏽', '👋🏾', '👋🏿'],
  complex: ['🧑‍🚀', '👨‍⚕️', '👩‍🎓', '🏴‍☠️']
};
```

## Success Criteria

### Functional Requirements
- [ ] Detects 100% of Unicode 15.1 emojis
- [ ] Detects all emoji sequences and skin tone variants
- [ ] Detects common shortcode formats
- [ ] Zero false positives on normal text
- [ ] Provides accurate position information

### Performance Requirements  
- [ ] < 1ms for typical text (1KB)
- [ ] < 100ms for large text (1MB)
- [ ] < 50MB memory usage for 10MB input
- [ ] Handles streaming/chunked processing

### Quality Requirements
- [ ] 95%+ test coverage
- [ ] All tests pass
- [ ] No memory leaks
- [ ] Cross-platform compatibility (Windows, macOS, Linux)

## Dependencies
- Node.js 18+ (for Unicode property escapes)
- No external dependencies for core detection

## Risks and Mitigations
- **Risk**: Unicode regex performance issues
  - **Mitigation**: Fallback patterns, lazy compilation
- **Risk**: Memory usage with large files  
  - **Mitigation**: Streaming processing, chunked analysis
- **Risk**: Incomplete emoji coverage
  - **Mitigation**: Comprehensive test data, Unicode spec validation

## Definition of Done
- All emoji types detected accurately
- Performance benchmarks met
- Test coverage >95%
- Documentation with examples
- No external dependencies
- Ready for file processing integration