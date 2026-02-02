/**
 * RAG Integration Example
 *
 * Shows how to integrate Tree-of-Thought into an existing RAG system.
 * No API keys required for the indexing and retrieval part!
 */

import { TreeOfThought, TreeIndex } from '../src';

/**
 * Example: Simple RAG System using Tree-of-Thought
 *
 * ToT handles the indexing and retrieval - you bring your own LLM for generation.
 */
class SimpleRAGSystem {
  private tot: TreeOfThought;
  private documents: Map<string, TreeIndex>;

  constructor() {
    this.tot = new TreeOfThought({ debug: false });
    this.documents = new Map();
  }

  /**
   * Add a document to the knowledge base
   */
  async addDocument(content: string, name: string): Promise<void> {
    console.log(`📚 Indexing: ${name}`);
    const tree = await this.tot.index(content, name);
    this.documents.set(name, tree);
    console.log(`✅ Indexed: ${this.tot.getTreeStats(tree).nodeCount} nodes`);
  }

  /**
   * Retrieve relevant context for a query
   */
  async getContext(query: string): Promise<string> {
    const contexts: string[] = [];

    for (const [name, tree] of this.documents) {
      const result = await this.tot.retrieve(tree, query);
      if (result.context) {
        contexts.push(`## From: ${name}\n${result.context}`);
      }
    }

    return contexts.join('\n\n');
  }

  /**
   * Query the RAG system
   * In a real system, you'd pass the context to your LLM here
   */
  async query(question: string): Promise<{ context: string; answer: string }> {
    const context = await this.getContext(question);

    // In a real RAG system, you'd call your LLM here:
    // const answer = await yourLLM.generate(`Context: ${context}\n\nQuestion: ${question}`);

    // For this example, we just return the context
    const answer = `[Your LLM would generate an answer based on the context above]`;

    return { context, answer };
  }

  /**
   * List all indexed documents
   */
  listDocuments(): string[] {
    return Array.from(this.documents.keys());
  }
}

// ============================================================================
// Example Usage
// ============================================================================

async function main() {
  const rag = new SimpleRAGSystem();

  // Add some documents
  await rag.addDocument(
    `
# Product Documentation

## Installation
To install, run: npm install our-product

## Quick Start
1. Import the module
2. Initialize with your config
3. Call the main function

## API Reference

### initialize(config)
Initialize the product.
- config.apiKey: Your API key
- config.debug: Enable debug mode

### process(data)
Process the input data.
- data: The data to process
- Returns: Processed result
`,
    'Product Docs'
  );

  await rag.addDocument(
    `
# FAQ

## How do I reset my password?
Go to Settings > Account > Reset Password

## What payment methods do you accept?
We accept credit cards, PayPal, and bank transfers.

## How do I contact support?
Email support@example.com or use the chat widget.

## Is there a free trial?
Yes! Sign up for a 14-day free trial, no credit card required.
`,
    'FAQ'
  );

  await rag.addDocument(
    `
# Troubleshooting Guide

## Common Errors

### Error: Connection Failed
Check your internet connection and firewall settings.

### Error: Invalid API Key
Verify your API key in the dashboard.

### Error: Rate Limited
Wait a few minutes and try again, or upgrade your plan.

## Getting Help
If you're still stuck, contact support with your error logs.
`,
    'Troubleshooting'
  );

  console.log('\n📋 Indexed documents:', rag.listDocuments());

  // Query the RAG system
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Query: "How do I install the product?"');
  console.log('='.repeat(60));

  const result1 = await rag.query('How do I install the product?');
  console.log('\n📄 Retrieved Context:\n');
  console.log(result1.context);

  console.log('\n' + '='.repeat(60));
  console.log('🔍 Query: "I\'m getting a rate limit error"');
  console.log('='.repeat(60));

  const result2 = await rag.query("I'm getting a rate limit error");
  console.log('\n📄 Retrieved Context:\n');
  console.log(result2.context);

  console.log('\n' + '='.repeat(60));
  console.log('🔍 Query: "Is there a free trial?"');
  console.log('='.repeat(60));

  const result3 = await rag.query('Is there a free trial?');
  console.log('\n📄 Retrieved Context:\n');
  console.log(result3.context);

  console.log('\n✅ RAG integration complete - no API keys used!\n');
}

main().catch(console.error);
