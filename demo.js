const { TreeOfThought } = require('./dist/index.js');

async function main() {
  console.log('=== Tree-of-Thought Demo ===\n');
  
  // Create instance with debug mode
  const tot = new TreeOfThought({ debug: true });
  
  // Sample document
  const document = `
# User Guide
  
## Installation
To install the software, run:
npm install my-package
  
## Configuration
Edit the config.json file to customize settings.
  
## Usage
Import the module and call the main function:
const result = myFunction();
  
## Troubleshooting
If you encounter issues:
1. Check your configuration
2. Restart the application
3. Contact support
`;
  
  console.log('📚 Indexing document...');
  const tree = await tot.index(document, 'User Guide');
  
  // Show stats
  const stats = tot.getTreeStats(tree);
  console.log('\n📊 Tree Statistics:');
  console.log(`  Nodes: ${stats.nodeCount}`);
  console.log(`  Depth: ${stats.maxDepth}`);
  console.log(`  Title: ${stats.title}`);
  
  // Show structure
  console.log('\n🌳 Tree Structure:');
  console.log(tot.getTreeStructure(tree));
  
  // Test queries
  const queries = [
    'How do I install?',
    'What configuration options are available?',
    'How to troubleshoot issues?'
  ];
  
  for (let i = 0; i < queries.length; i++) {
    console.log(`\n🔍 Query ${i + 1}: "${queries[i]}"`);
    const result = await tot.retrieve(tree, queries[i]);
    console.log('📄 Retrieved Context:');
    console.log(result.context);
    console.log(`⏱️  Time: ${result.totalTimeMs}ms`);
  }
  
  console.log('\n✅ Demo completed!');
}

main().catch(console.error);