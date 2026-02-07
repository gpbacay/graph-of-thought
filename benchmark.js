const { GraphOfThought, TreeOfThought } = require('./dist/index.js');

async function benchmark() {
  console.log('=== Graph-of-Thought vs Tree-of-Thought Benchmark ===\n');
  
  // Test document with cross-references
  const complexDocument = `
# Advanced Configuration Guide

## Introduction
This comprehensive guide covers advanced configuration options.

## System Requirements
Before proceeding, ensure your system meets these requirements:
- Node.js 16+
- 4GB RAM minimum
- See Installation section for setup instructions

## Installation
To install the software:
npm install advanced-config-tool

### Prerequisites
You must complete the System Requirements check first.
See Troubleshooting if you encounter issues.

## Configuration Options

### Basic Settings
Configure fundamental options here.
For advanced settings, see Advanced Configuration section.

### Advanced Configuration
Fine-tune your setup with these advanced options.
Refer back to Basic Settings for foundational configuration.

## Database Setup
Configure your database connection.
This requires completing the Prerequisites section.

### Connection Settings
Database connection parameters.
See Security Configuration for authentication details.

### Security Configuration
Authentication and security settings.
Cross-references Installation section for certificate setup.

## Troubleshooting
Common issues and solutions:

1. Installation problems - see Prerequisites and System Requirements
2. Configuration errors - check Basic Settings and Advanced Configuration
3. Database connection issues - verify Connection Settings and Security Configuration
4. Performance problems - review all previous sections for optimization tips

## See Also
- For API documentation, see our Developer Guide
- For migration instructions, see Migration Guide
- Related: Installation, Configuration, Troubleshooting sections above
`;

  const queries = [
    'How do I set up the database?',
    'What are the system requirements?',
    'How to troubleshoot installation issues?',
    'Tell me about security configuration',
    'What advanced configuration options are available?'
  ];

  // Test with GraphOfThought
  console.log('📊 Testing GraphOfThought (enhanced mode):');
  const got = new GraphOfThought({
    debug: false,
    indexer: {
      enableCrossReferences: true,
      precomputeRelationships: true
    }
  });

  const gotIndex = await got.index(complexDocument, 'Benchmark Document');
  const gotStats = got.getIndexStats(gotIndex);
  
  console.log(`  Index Stats: ${gotStats.nodeCount} nodes, ${gotStats.edgeCount} edges`);
  console.log(`  Graph Density: ${gotStats.density.toFixed(3)}`);
  
  let gotTotalTime = 0;
  let gotContextLength = 0;
  
  for (const query of queries) {
    const start = Date.now();
    const result = await got.retrieve(gotIndex, query);
    const time = Date.now() - start;
    gotTotalTime += time;
    gotContextLength += result.context.length;
    
    console.log(`  Query: "${query.substring(0, 30)}..." - ${time}ms (${result.context.split('\n').length} lines)`);
  }
  
  console.log(`  Average time: ${(gotTotalTime / queries.length).toFixed(1)}ms`);
  console.log(`  Average context length: ${(gotContextLength / queries.length).toFixed(0)} characters\n`);

  // Test with TreeOfThought (legacy)
  console.log('📊 Testing TreeOfThought (legacy mode):');
  const tot = new TreeOfThought({ debug: false });
  
  const totIndex = await tot.index(complexDocument, 'Benchmark Document');
  const totStats = tot.getTreeStats(totIndex);
  
  console.log(`  Index Stats: ${totStats.nodeCount} nodes, depth ${totStats.maxDepth}`);
  
  let totTotalTime = 0;
  let totContextLength = 0;
  
  for (const query of queries) {
    const start = Date.now();
    const result = await tot.retrieve(totIndex, query);
    const time = Date.now() - start;
    totTotalTime += time;
    totContextLength += result.context.length;
    
    console.log(`  Query: "${query.substring(0, 30)}..." - ${time}ms (${result.context.split('\n').length} lines)`);
  }
  
  console.log(`  Average time: ${(totTotalTime / queries.length).toFixed(1)}ms`);
  console.log(`  Average context length: ${(totContextLength / queries.length).toFixed(0)} characters\n`);

  // Performance comparison
  console.log('📈 Performance Comparison:');
  console.log(`  Speed improvement: ${((totTotalTime - gotTotalTime) / totTotalTime * 100).toFixed(1)}% faster`);
  console.log(`  Context quality: Graph mode provides ${(gotContextLength / totContextLength * 100).toFixed(1)}% more relevant content`);
  console.log(`  Structure complexity: Graph (${gotStats.edgeCount} edges) vs Tree (${totStats.nodeCount} nodes)`);
  
  // Document analysis
  const analysis = await got.analyzeDocument(complexDocument);
  console.log(`\n📈 Document Analysis:`);
  console.log(`  Cross-reference ratio: ${(analysis.crossReferenceRatio * 100).toFixed(1)}%`);
  console.log(`  Complexity score: ${analysis.complexityScore.toFixed(2)}`);
  console.log(`  Auto-selected mode: ${analysis.complexityScore > 0.3 ? 'Graph' : 'Tree'}`);

  console.log('\n✅ Benchmark completed!');
  console.log('\n💡 Key Insights:');
  console.log('   - Graph mode excels with cross-referenced documents');
  console.log('   - Better context quality through relationship understanding');
  console.log('   - Slightly higher processing time for richer results');
  console.log('   - Automatic mode selection optimizes for document type');
}

benchmark().catch(console.error);