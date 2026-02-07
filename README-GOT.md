# Graph-of-Thought (GoT)

**Enhanced Document Indexing and Retrieval with Graph-Based Intelligence**

Graph-of-Thought is the evolved version of Tree-of-Thought, implementing advanced graph-based indexing with BMSSP (Bounded Multi-Source Shortest Path) algorithms for intelligent document understanding and retrieval.

[![npm version](https://badge.fury.io/js/graph-of-thought.svg)](https://www.npmjs.com/package/graph-of-thought)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Key Features

- **Graph-Based Indexing**: Advanced document structure understanding with cross-references
- **BMSSP Algorithm**: Efficient multi-source path finding for complex queries
- **Hybrid Intelligence**: Automatically switches between graph and tree modes based on document complexity
- **Cross-Reference Understanding**: Recognizes and utilizes relationships between document sections
- **Zero External Dependencies**: Works completely standalone - no API keys or vector databases required
- **Backward Compatible**: Includes legacy Tree-of-Thought functionality

## Installation

```bash
npm install graph-of-thought
```

## Quick Start

```typescript
import { GraphOfThought } from 'graph-of-thought';

// Create instance - NO configuration needed
const got = new GraphOfThought();

// Index your document (automatically chooses best approach)
const index = await got.index(`
# User Guide

## Installation
Run npm install to get started.

## Configuration  
Edit config.json to customize settings.

## See Also
For advanced features, see the Advanced Features section.
`, 'User Guide');

// Retrieve with cross-reference understanding
const result = await got.retrieve(index, 'How do I configure after installation?');

console.log(result.context);
// Output includes both Configuration and Installation sections due to cross-references
```

## How It Works

### 1. Intelligent Document Analysis
The library automatically analyzes document complexity:
- **Cross-reference detection**: Identifies "see also", "refer to" relationships
- **Section complexity scoring**: Measures document structural complexity
- **Automatic mode selection**: Chooses graph or tree mode based on content

### 2. Graph Construction
For complex documents:
- **Nodes**: Document sections with semantic content
- **Edges**: Relationships between sections (parent-child, cross-references, semantic similarity)
- **Metadata**: Centrality measures, keywords, and relationship weights

### 3. BMSSP Path Finding
When querying complex documents:
- **Multi-source search**: Finds paths from multiple relevant sections simultaneously
- **Bounded search**: Limits depth to prevent combinatorial explosion
- **Path scoring**: Ranks results by relevance and relationship strength

### 4. Context Formation
- **Connected sections**: Retrieves related content based on document relationships
- **Reasoning trace**: Explains why certain sections were selected
- **Formatted output**: Ready for LLM consumption

## Advanced Usage

### Force Specific Indexing Modes

```typescript
// Force graph mode for maximum relationship understanding
const graphIndex = await got.index(content, 'Title', undefined, { 
  forceMode: 'graph' 
});

// Force tree mode for simple hierarchical documents
const treeIndex = await got.index(content, 'Title', undefined, { 
  forceMode: 'tree' 
});
```

### Custom Configuration

```typescript
const got = new GraphOfThought({
  indexer: {
    maxDepth: 4,              // Maximum search depth
    maxResults: 15,           // Results to return
    enableCrossReferences: true,  // Enable relationship detection
    precomputeRelationships: true, // Pre-calculate node metrics
    minEdgeWeight: 0.2        // Minimum relationship strength
  },
  hybridMode: {
    autoSwitchThreshold: 0.3, // Complexity threshold for graph mode
    fallbackToTree: true      // Use tree mode for simple documents
  },
  debug: true                 // Enable detailed logging
});
```

### Document Analysis

```typescript
// Analyze document characteristics
const analysis = await got.analyzeDocument(content);
console.log('Complexity score:', analysis.complexityScore);
console.log('Cross-reference ratio:', analysis.crossReferenceRatio);

// Get index statistics
const stats = got.getIndexStats(index);
console.log('Graph density:', stats.density);
console.log('Average node degree:', stats.averageDegree);
```

## Performance Comparison

| Feature | Traditional RAG | Tree-of-Thought | Graph-of-Thought |
|---------|----------------|-----------------|------------------|
| Setup Time | Minutes | Seconds | Seconds |
| Query Time | 500ms-2s | 2-10ms | 5-25ms |
| Cross-references | No | Limited | Full Support |
| Semantic Paths | No | No | Yes (BMSSP) |
| Complexity Handling | Good | Good | Excellent |

## API Reference

### GraphOfThought

```typescript
const got = new GraphOfThought(config?: GoTConfig);
```

### Methods

| Method | Description |
|--------|-------------|
| `index(content, title, description?, options?)` | Index content with automatic mode selection |
| `indexFile(filePath, options?)` | Index file with format detection |
| `retrieve(index, query)` | Retrieve context using graph intelligence |
| `search(index, query)` | Search without content retrieval |
| `analyzeDocument(content)` | Analyze document complexity |
| `getIndexStats(index)` | Get graph statistics |
| `getCachedIndex(title)` | Get cached index |

### Configuration Types

```typescript
interface GoTConfig {
  indexer?: GraphIndexerConfig;
  debug?: boolean;
  cache?: { enabled?: boolean; ttlMs?: number };
  hybridMode?: {
    autoSwitchThreshold?: number;
    fallbackToTree?: boolean;
  };
}

interface GraphIndexerConfig {
  maxDepth?: number;
  maxResults?: number;
  enableCrossReferences?: boolean;
  precomputeRelationships?: boolean;
  minEdgeWeight?: number;
}
```

## Use Cases

- **Technical Documentation**: Handle cross-references between API sections
- **Research Papers**: Understand relationships between concepts and citations
- **Knowledge Bases**: Navigate complex interconnected information
- **Legal Documents**: Follow references between clauses and sections
- **Academic Texts**: Trace concept relationships across chapters

## Migration from Tree-of-Thought

```typescript
// Old Tree-of-Thought approach
import { TreeOfThought } from 'tree-of-thought';
const tot = new TreeOfThought();

// New Graph-of-Thought approach (recommended)
import { GraphOfThought } from 'graph-of-thought';
const got = new GraphOfThought();

// Legacy compatibility still available
import { TreeOfThought } from 'graph-of-thought'; // Same import path
```

## Contributing

Contributions welcome! This is an open-source project.

1. Fork the repository
2. Create your feature branch
3. Submit a pull request

## License

MIT License - Use it however you want!

---

**Enhanced intelligence. Zero dependencies. Just install and use.**

Built by [Gianne Bacay](https://github.com/gpbacay)