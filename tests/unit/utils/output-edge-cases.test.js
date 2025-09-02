/**
 * Edge case tests for output utilities
 */

const { OutputFormatter, OutputUtils } = require('../../../src/utils/output');

describe('Output Utils - Edge Cases', () => {
  let originalLog;

  beforeEach(() => {
    originalLog = console.log;
    console.log = jest.fn();
  });

  afterEach(() => {
    console.log = originalLog;
  });

  describe('OutputFormatter', () => {
    let formatter;
    
    beforeEach(() => {
      formatter = new OutputFormatter();
    });
    
    test('handles empty data gracefully', () => {
      expect(() => formatter.formatTable([])).not.toThrow();
      expect(() => formatter.formatResults([], 'json')).not.toThrow();
      expect(() => formatter.formatResults([], 'minimal')).not.toThrow();
    });
    
    test('handles null data gracefully', () => {
      expect(() => formatter.formatTable(null)).not.toThrow();
      expect(() => formatter.formatResults(null, 'json')).not.toThrow();
      expect(() => formatter.formatResults(null, 'minimal')).not.toThrow();
    });
    
    test('handles undefined data gracefully', () => {
      expect(() => formatter.formatTable(undefined)).not.toThrow();
      expect(() => formatter.formatResults(undefined, 'json')).not.toThrow();
      expect(() => formatter.formatResults(undefined, 'minimal')).not.toThrow();
    });
    
    test('handles malformed data structure', () => {
      const badData = [{ /* missing expected fields */ }];
      expect(() => formatter.formatTable(badData)).not.toThrow();
      expect(() => formatter.formatResults(badData, 'json')).not.toThrow();
      expect(() => formatter.formatResults(badData, 'minimal')).not.toThrow();
    });
  });

  describe('OutputUtils', () => {
    test('print method exists and handles different formats', () => {
      const testData = [{
        file: 'test.js',
        line: 1,
        column: 1,
        emoji: '😀',
        context: 'test 😀'
      }];
      
      expect(() => OutputUtils.print(testData, 'table')).not.toThrow();
      expect(() => OutputUtils.print(testData, 'json')).not.toThrow();
      expect(() => OutputUtils.print(testData, 'minimal')).not.toThrow();
    });
    
    test('handles invalid format type gracefully', () => {
      expect(() => OutputUtils.print([], 'invalid-format')).not.toThrow();
    });
    
    test('handles very large result sets efficiently', () => {
      const largeData = Array(1000).fill({
        file: 'test.js',
        line: 1,
        column: 1,
        emoji: '😀',
        context: 'test'
      });
      
      expect(() => OutputUtils.print(largeData, 'json')).not.toThrow();
    });
  });
});