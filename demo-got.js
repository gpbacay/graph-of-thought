const { GraphOfThought } = require('./dist/index.js');

async function main() {
  console.log('=== Graph-of-Thought Demo ===\n');
  
  // Create GoT instance with debug mode
  const got = new GraphOfThought({ 
    debug: true,
    indexer: {
      enableCrossReferences: true,
      precomputeRelationships: true
    },
    hybridMode: {
      autoSwitchThreshold: 0.1, // Low threshold to demonstrate graph mode
      fallbackToTree: true
    }
  });
  
  // Complex document with cross-references
  const complexDocument = `
# Advanced User Guide
  
## Introduction
This guide covers advanced features and configuration options for our software platform.
  
## Installation
To install the software, run:
npm install advanced-software-package

### Prerequisites
Before installation, ensure you have:
- Node.js version 16 or higher
- npm version 8 or higher
- See Configuration section for environment setup
  
## Configuration
Edit the config.json file to customize your setup.
For database configuration, see the Database Setup subsection.

### Environment Variables
Set the following environment variables:
- DATABASE_URL: Connection string for your database
- API_KEY: Your authentication key
- Refer to Installation section for prerequisites
  
### Database Setup
Configure your database connection settings here.
This requires the prerequisites mentioned in the Installation section.
  
## Advanced Features
  
### Feature A
Description of Feature A with cross-reference to Feature B.
  
### Feature B  
Related to Feature A. Also see the Troubleshooting section for common issues.
  
## Troubleshooting
If you encounter problems:
1. Check your configuration (see Configuration section)
2. Verify installation requirements (see Installation section)
3. Review the prerequisites mentioned in Prerequisites
4. For database issues, see Database Setup
`;
  
  console.log('📚 Indexing complex document with cross-references...');
  const index = await got.index(complexDocument, 'Advanced User Guide');
  
  // Show index statistics
  const stats = got.getIndexStats(index);
  console.log('\n📊 Index Statistics:');
  console.log(`  Nodes: ${stats.nodeCount}`);
  console.log(`  Edges: ${stats.edgeCount}`);
  console.log(`  Average Degree: ${stats.averageDegree.toFixed(2)}`);
  console.log(`  Graph Density: ${stats.density.toFixed(3)}`);
  
  // Show document analysis
  const analysis = await got.analyzeDocument(complexDocument);
  console.log('\n📈 Document Analysis:');
  console.log(`  Cross-reference ratio: ${(analysis.crossReferenceRatio * 100).toFixed(1)}%`);
  console.log(`  Average section length: ${analysis.avgSectionLength.toFixed(1)} characters`);
  console.log(`  Complexity score: ${analysis.complexityScore.toFixed(2)}`);
  console.log(`  Sections detected: ${analysis.sectionCount}`);
  
  // Test cross-reference queries
  const queries = [
    'How do I set up the database?',
    'What are the prerequisites for installation?',
    'How to troubleshoot database connection issues?',
    'Tell me about the relationship between features A and B'
  ];
  
  console.log('\n🔍 Testing Graph-based Queries:');
  console.log('(Note: Graph mode enables cross-reference understanding)\n');
  
  for (let i = 0; i < queries.length; i++) {
    console.log(`Query ${i + 1}: "${queries[i]}"`);
    const result = await got.retrieve(index, queries[i]);
    
    console.log('📄 Retrieved Context (showing connected sections):');
    const lines = result.context.split('\n').slice(0, 8); // Show first 8 lines
    console.log(lines.join('\n') + (result.context.split('\n').length > 8 ? '\n...' : ''));
    
    console.log(`⏱️  Time: ${result.totalTimeMs}ms`);
    console.log('---');
  }
  
  // Compare with force tree mode
  console.log('\n🔍 Comparison: Force Tree Mode');
  const treeIndex = await got.index(complexDocument, 'Tree Mode Comparison', undefined, { forceMode: 'tree' });
  const treeResult = await got.retrieve(treeIndex, 'How do I set up the database?');
  console.log('Tree mode result length:', treeResult.context.split('\n').length, 'lines');
  
  console.log('\n✅ Graph-of-Thought demo completed!');
  console.log('\n💡 Key Advantages Demonstrated:');
  console.log('   - Cross-reference understanding between sections');
  console.log('   - Context-aware path finding using BMSSP');
  console.log('   - Automatic complexity-based mode selection');
  console.log('   - Rich relationship networks between document sections');
}

main().catch(console.error);