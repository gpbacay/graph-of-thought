/**
 * Tree Serialization Example
 *
 * Shows how to save and load tree indexes for persistence.
 * Trees are plain JSON objects - easy to store anywhere.
 */

import * as fs from 'fs';
import * as path from 'path';
import { TreeOfThought, TreeIndex } from '../src';

async function main() {
  const tot = new TreeOfThought();

  // Create a sample document
  const document = `
# Technical Specification

## Overview
This document describes the system architecture.

## Components

### Frontend
- React-based SPA
- TypeScript
- Tailwind CSS

### Backend
- Node.js with Express
- PostgreSQL database
- Redis caching

### Infrastructure
- AWS hosting
- Docker containers
- Kubernetes orchestration

## Security
All communications are encrypted using TLS 1.3.
Authentication uses JWT tokens with refresh rotation.
`;

  // Index the document
  console.log('📚 Indexing document...');
  const tree = await tot.index(document, 'Technical Spec');

  // Show tree stats
  console.log('📊 Stats:', tot.getTreeStats(tree));

  // Serialize to JSON
  const jsonPath = path.join(__dirname, 'tree-cache.json');
  console.log(`\n💾 Saving to: ${jsonPath}`);
  fs.writeFileSync(jsonPath, JSON.stringify(tree, null, 2));
  console.log('✅ Saved!');

  // Load from JSON
  console.log('\n📂 Loading from file...');
  const loadedTree: TreeIndex = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log('✅ Loaded!');
  console.log('📊 Loaded stats:', tot.getTreeStats(loadedTree));

  // Query the loaded tree
  console.log('\n🔍 Querying loaded tree: "What is the backend stack?"');
  const result = await tot.retrieve(loadedTree, 'What is the backend stack?');
  console.log('\n📄 Context:\n', result.context);

  // Clean up
  fs.unlinkSync(jsonPath);
  console.log('\n🧹 Cleaned up temp file');

  // Tip: You can also store trees in:
  console.log('\n💡 Storage options:');
  console.log('   - Local file system (JSON)');
  console.log('   - Redis / Memcached');
  console.log('   - SQLite / PostgreSQL (as JSON column)');
  console.log('   - S3 / Cloud Storage');
  console.log('   - Browser localStorage');
}

main().catch(console.error);
