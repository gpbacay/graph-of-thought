/**
 * Basic Usage Example - NO API KEYS NEEDED
 *
 * This example demonstrates standalone usage without any external services.
 */

import { TreeOfThought } from '../src';

async function main() {
  // Create instance - no configuration needed!
  const tot = new TreeOfThought({ debug: true });

  // Sample document
  const document = `
# Company Handbook

## Introduction
Welcome to our company! This handbook contains important information about our policies and procedures.

## Work Hours
Our standard work hours are 9 AM to 5 PM, Monday through Friday. Flexible schedules may be arranged with your manager.

### Remote Work Policy
Employees may work remotely up to 2 days per week with manager approval. Remote work requires:
- Reliable internet connection
- Dedicated workspace
- Available during core hours (10 AM - 3 PM)

## Benefits

### Health Insurance
We offer comprehensive health insurance including:
- Medical coverage
- Dental coverage
- Vision coverage

### Paid Time Off
- 15 days PTO annually for first 3 years
- 20 days PTO annually after 3 years
- 10 paid holidays per year

## Code of Conduct
All employees are expected to treat colleagues with respect and professionalism.

### Harassment Policy
We have zero tolerance for harassment of any kind. Report incidents to HR immediately.
`;

  // Index the document
  console.log('\n📚 Indexing document...\n');
  const tree = await tot.index(document, 'Company Handbook');

  // Get tree statistics
  const stats = tot.getTreeStats(tree);
  console.log('📊 Tree Stats:', stats);

  // Print tree structure
  console.log('\n🌳 Tree Structure:');
  console.log(tot.getTreeStructure(tree));

  // Query 1: Simple question
  console.log('\n\n🔍 Query 1: "What are the work hours?"');
  const result1 = await tot.retrieve(tree, 'What are the work hours?');
  console.log('\n📄 Context:\n', result1.context);
  console.log('\n🧠 Reasoning:', result1.searchResult.thinking);
  console.log('⏱️  Time:', result1.totalTimeMs, 'ms');

  // Query 2: Question about benefits
  console.log('\n\n🔍 Query 2: "What health benefits are offered?"');
  const result2 = await tot.retrieve(tree, 'What health benefits are offered?');
  console.log('\n📄 Context:\n', result2.context);

  // Query 3: Policy question
  console.log('\n\n🔍 Query 3: "How do I report harassment?"');
  const result3 = await tot.retrieve(tree, 'How do I report harassment?');
  console.log('\n📄 Context:\n', result3.context);

  // Query 4: Remote work
  console.log('\n\n🔍 Query 4: "Can I work from home?"');
  const result4 = await tot.retrieve(tree, 'Can I work from home?');
  console.log('\n📄 Context:\n', result4.context);

  console.log('\n✅ All queries completed without any API keys!\n');
}

main().catch(console.error);
