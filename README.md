# Graph-of-Thought (GoT) & Tree-of-Thought (ToT)

**Advanced Document Indexing and Retrieval with Graph-Based Intelligence**

[![npm version](https://badge.fury.io/js/graph-of-thought.svg)](https://www.npmjs.com/package/graph-of-thought)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Graph-of-Thought is an **open-source** Node.js library for document indexing and retrieval that works **completely standalone** - no API keys, no external services, no vector databases required. It combines both Tree-of-Thought (hierarchical) and Graph-of-Thought (networked) approaches with automatic mode selection based on document complexity.

## Key Features

- **Dual Architecture**: Tree-based (hierarchical) and Graph-based (networked) indexing
- **Automatic Mode Selection**: Chooses between tree and graph modes based on document complexity
- **Graph Intelligence**: Advanced BMSSP (Bounded Multi-Source Shortest Path) algorithm for cross-reference understanding
- **Zero Dependencies on External Services** - Works offline, no API keys needed
- **No Vector Database Required** - Uses intelligent graph/tree structures instead
- **Selective Node Activation** - Only activates nodes relevant to queries, not all nodes at once
- **Simple Integration** - Drop into any existing RAG system
- **Open Source** - MIT licensed, use it however you want
- **Optional LLM Enhancement** - Add LLM providers for smarter retrieval (optional)

## Installation

```bash
npm install graph-of-thought
```

That's it. No API keys to configure, no services to set up.

## Quick Start (No API Keys!)

### Using Graph-of-Thought (Recommended)
```typescript
import { GraphOfThought } from 'graph-of-thought';

// Create instance - NO configuration needed (automatically selects best approach)
const got = new GraphOfThought();

// Index your document (auto-selects tree or graph mode based on complexity)
const index = await got.index(`
# User Guide

## Installation
Run npm install to get started.

## Configuration
Edit config.json to customize settings.

## Usage
Import the module and call the main function.

## See Also
For advanced features, see the Advanced Features section.
`, 'User Guide');

// Retrieve with cross-reference understanding
const result = await got.retrieve(index, 'How do I configure after installation?');

console.log(result.context);
// Output includes both Configuration and Installation sections due to cross-references
```

### Using Tree-of-Thought (Legacy)
```typescript
import { TreeOfThought } from 'graph-of-thought'; // Also available in same package

// Create instance - NO configuration needed
const tot = new TreeOfThought();

// Index your document (creates hierarchical tree structure)
const tree = await tot.index(`
# User Guide

## Installation
Run npm install to get started.

## Configuration
Edit config.json to customize settings.

## Usage
Import the module and call the main function.
`, 'User Guide');

// Retrieve relevant content
const result = await tot.retrieve(tree, 'How do I install?');

console.log(result.context);
// Output: "### Installation\nRun npm install to get started."
```

## How It Works

### Architecture Overview
The system intelligently selects between two architectures:

#### Tree-of-Thought (ToT)
- Creates hierarchical tree structures with parent-child relationships
- Best for simple, hierarchical documents
- Efficient for linear navigation
- Selective activation: only relevant branches are explored during queries

#### Graph-of-Thought (GoT) 
- Creates networked graph structures with multiple relationship types
- Identifies cross-references, semantic relationships, and connections
- Best for complex documents with interconnections
- Uses BMSSP algorithm for multi-source path finding
- Selective activation: only relevant nodes and paths are explored during queries

### 1. Document Analysis and Indexing
The system analyzes document complexity and automatically chooses the best approach:

```typescript
Document
├── Tree Mode (for simple docs):
│   ├── Installation (nodeId: abc123)
│   │   └── "Run npm install to get started..."
│   ├── Configuration (nodeId: def456)
│   │   └── "Edit config.json to customize..."
│   └── Usage (nodeId: ghi789)
│       └── "Import the module and call..."
└── Graph Mode (for complex docs):
    ├── Installation (nodeId: abc123)
    ├── Configuration (nodeId: def456) 
    ├── Usage (nodeId: ghi789)
    └── Edges: [abc123 ↔ def456 (cross-ref)], [def456 ↔ ghi789 (semantic)]
```

### 2. Selective Node Activation During Retrieval
- When you query, the system identifies initial relevant nodes based on keyword matching
- Only relevant nodes are activated and explored (not all nodes simultaneously)
- For GoT: BMSSP algorithm traverses connected paths from initial nodes
- For ToT: Traverses relevant branches of the tree hierarchy
- Results are bounded by depth/max results to maintain performance

### 3. Context Formation
- Retrieved sections are formatted as context for your RAG pipeline
- GoT includes connected sections based on document relationships
- ToT includes hierarchical sections based on tree structure

## Node Activation Process

The system does **NOT** activate all nodes simultaneously. Instead:

1. **Indexing Phase**: All nodes are created and stored in memory but remain dormant
2. **Query Phase**: Only nodes relevant to the query are activated:
   - Initial relevant nodes identified via keyword matching
   - For GoT: BMSSP explores connected nodes within bounded depth
   - For ToT: Relevant tree branches are traversed
   - Irrelevant nodes remain inactive

This selective activation ensures scalability and efficiency.

## Integration with Existing RAG Systems

Both Tree-of-Thought and Graph-of-Thought are designed to **enhance** your existing RAG system:

```typescript
import { GraphOfThought } from 'graph-of-thought';

// Your existing RAG pipeline
class MyRAGSystem {
  private got = new GraphOfThought(); // Auto-selects best approach
  private indexes: Map<string, any> = new Map();

  // Index documents using GoT/ToT
  async addDocument(content: string, name: string) {
    const index = await this.got.index(content, name);
    this.indexes.set(name, index);
  }

  // Use GoT/ToT for retrieval, then pass to your LLM
  async query(question: string) {
    // Retrieve from all indexed documents
    let allContext = '';
    for (const index of this.indexes.values()) {
      const result = await this.got.retrieve(index, question);
      allContext += result.context + '\n\n';
    }

    // Pass context to your existing LLM call
    return this.yourExistingLLMCall(question, allContext);
  }
}
```

## API Reference

### GraphOfThought (Recommended)

```typescript
const got = new GraphOfThought(options?: {
  debug?: boolean;           // Enable debug logging
  indexer?: {
    maxDepth?: number;       // Max search depth (default: 3)
    maxResults?: number;     // Max results to return (default: 10)
    enableCrossReferences?: boolean;  // Enable relationship detection
    precomputeRelationships?: boolean; // Pre-calculate node metrics
    minEdgeWeight?: number;  // Min relationship strength (default: 0.1)
  };
  hybridMode?: {
    autoSwitchThreshold?: number; // Complexity threshold for graph mode
    fallbackToTree?: boolean;     // Use tree mode for simple docs
  };
});
```

### TreeOfThought (Legacy)

```typescript
const tot = new TreeOfThought(options?: {
  debug?: boolean;           // Enable debug logging
  search?: {
    maxResults?: number;     // Max results to return (default: 10)
  };
  generator?: {
    maxSummaryLength?: number; // Summary length (default: 200)
  };
});
```

### Shared Methods

| Method | Description |
|--------|-------------|
| `index(content, title, description?)` | Index content (auto-selects tree/graph mode) |
| `indexFile(filePath, options?)` | Index a file (PDF*, MD, HTML, TXT) |
| `indexMarkdown(content, title)` | Index markdown content |
| `retrieve(index, query)` | Retrieve relevant content |
| `search(index, query)` | Search without content retrieval |
| `collectAllText(index)` | Get all text from index |
| `getTreeStats(index)` | Get tree statistics (for tree mode) |
| `getIndexStats(index)` | Get graph statistics (for graph mode) |
| `getTreeStructure(index)` | Get printable structure |
| `findNodesByTitle(index, query)` | Find nodes by title |
| `getNodeById(index, nodeId)` | Get specific node |

*PDF parsing requires optional `@cyber2024/pdf-parse-fixed` package

### Return Types

```typescript
// Retrieval result
interface RetrievalResult {
  context: string;           // Formatted context for your LLM
  contents: RetrievedContent[]; // Raw retrieved items
  searchResult: {
    thinking: string;        // Search reasoning (GoT) or node list (ToT)
    nodeList: string[];      // Matched node IDs
    searchTimeMs: number;    // Search duration
  };
  totalTimeMs: number;       // Total retrieval time
}

// Index structure (tree or graph)
interface TreeIndex {
  title: string;
  description?: string;
  nodes: TreeNode[];
  createdAt: string;
  version: string;
}

interface GraphIndex {
  title: string;
  description?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];        // Relationships between nodes
  metadata: {
    createdAt: string;
    version: string;
    nodeCount: number;
    edgeCount: number;
    indexType: 'graph' | 'tree';
  };
}
```

## Advanced Usage

### Forcing Specific Indexing Modes

```typescript
import { GraphOfThought } from 'graph-of-thought';

const got = new GraphOfThought();

// Force graph mode for maximum relationship understanding
const graphIndex = await got.index(content, 'Title', undefined, { 
  forceMode: 'graph' 
});

// Force tree mode for simple hierarchical documents
const treeIndex = await got.index(content, 'Title', undefined, { 
  forceMode: 'tree' 
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

### Indexing Files

```typescript
// Index different file types
const pdfIndex = await got.indexFile('./document.pdf');  // Requires pdf-parse
const mdIndex = await got.indexFile('./readme.md');
const htmlIndex = await got.indexFile('./page.html');
const txtIndex = await got.indexFile('./notes.txt');
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

### Serializing Indexes

```typescript
// Indexes are plain objects - serialize easily
const index = await got.index(content, 'My Doc');

// Save to file
fs.writeFileSync('index.json', JSON.stringify(index));

// Load later
const loadedIndex = JSON.parse(fs.readFileSync('index.json', 'utf-8'));
const result = await got.retrieve(loadedIndex, 'query');
```

## Optional: LLM-Enhanced Search

For smarter retrieval, you can optionally add an LLM provider:

```bash
# Install your preferred provider
npm install openai  # or @anthropic-ai/sdk or @google/generative-ai
```

```typescript
import { GraphOfThought, createOpenAIProvider } from 'graph-of-thought';

const got = new GraphOfThought({
  llm: createOpenAIProvider('gpt-4-turbo'),  // Requires OPENAI_API_KEY
});

// Now retrieval uses LLM reasoning instead of keyword matching
const result = await got.retrieve(index, 'complex query');
```

**But this is completely optional!** The library works great without any LLM.

## Performance Comparison

| Feature | Traditional RAG | Tree-of-Thought | Graph-of-Thought |
|---------|----------------|-----------------|------------------|
| Setup Time | Minutes | Seconds | Seconds |
| Query Time | 500ms-2s | 2-10ms | 5-25ms |
| Cross-references | No | Limited | Full Support |
| Semantic Paths | No | No | Yes (BMSSP) |
| Complexity Handling | Good | Good | Excellent |
| Node Activation | All nodes | Relevant branches only | Relevant nodes/paths only |

## Use Cases

- **Documentation Search** - Index your docs for quick retrieval
- **Knowledge Bases** - Build searchable knowledge bases with cross-reference understanding
- **Chatbot Context** - Provide relevant context to chatbots
- **Technical Documentation** - Handle cross-references between API sections
- **Research Papers** - Understand relationships between concepts and citations
- **Legal Documents** - Follow references between clauses and sections
- **Academic Texts** - Trace concept relationships across chapters
- **Content Management** - Organize and search content
- **Offline RAG** - Run RAG systems without internet

## Contributing

Contributions welcome! This is an open-source project.

1. Fork the repository
2. Create your feature branch
3. Submit a pull request

## License

MIT License - Use it however you want!

---

**Enhanced intelligence. Zero dependencies. Selective node activation. Just install and use.**

Built by [Gianne Bacay](https://github.com/gpbacay)
