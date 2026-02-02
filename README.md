# Tree-of-Thought (ToT)

**Vectorless Document Indexing and Retrieval for RAG Systems**

[![npm version](https://badge.fury.io/js/tree-of-thought.svg)](https://www.npmjs.com/package/tree-of-thought)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Tree-of-Thought is an **open-source** Node.js library for document indexing and retrieval that works **completely standalone** - no API keys, no external services, no vector databases required.

## Key Features

- **Zero Dependencies on External Services** - Works offline, no API keys needed
- **No Vector Database Required** - Uses hierarchical tree structures instead
- **Simple Integration** - Drop into any existing RAG system
- **Open Source** - MIT licensed, use it however you want
- **Optional LLM Enhancement** - Add LLM providers for smarter retrieval (optional)

## Installation

```bash
npm install tree-of-thought
```

That's it. No API keys to configure, no services to set up.

## Quick Start (No API Keys!)

```typescript
import { TreeOfThought } from 'tree-of-thought';

// Create instance - NO configuration needed
const tot = new TreeOfThought();

// Index your document
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

### 1. Document Indexing
Tree-of-Thought parses your documents and builds a hierarchical tree structure:

```
Document
├── Installation (nodeId: abc123)
│   └── "Run npm install to get started..."
├── Configuration (nodeId: def456)
│   └── "Edit config.json to customize..."
└── Usage (nodeId: ghi789)
    └── "Import the module and call..."
```

### 2. Keyword-Based Retrieval
When you query, ToT uses TF-IDF scoring to find relevant nodes:
- Title matches get highest weight
- Summary/content matches contribute to score
- Returns top-N most relevant sections

### 3. Context Formatting
Retrieved sections are formatted as context for your RAG pipeline.

## Integration with Existing RAG Systems

Tree-of-Thought is designed to **enhance** your existing RAG system:

```typescript
import { TreeOfThought } from 'tree-of-thought';

// Your existing RAG pipeline
class MyRAGSystem {
  private tot = new TreeOfThought();
  private trees: Map<string, TreeIndex> = new Map();

  // Index documents using ToT
  async addDocument(content: string, name: string) {
    const tree = await this.tot.index(content, name);
    this.trees.set(name, tree);
  }

  // Use ToT for retrieval, then pass to your LLM
  async query(question: string) {
    // Retrieve from all indexed documents
    let allContext = '';
    for (const tree of this.trees.values()) {
      const result = await this.tot.retrieve(tree, question);
      allContext += result.context + '\n\n';
    }

    // Pass context to your existing LLM call
    return this.yourExistingLLMCall(question, allContext);
  }
}
```

## API Reference

### TreeOfThought

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

### Methods

| Method | Description |
|--------|-------------|
| `index(content, title, description?)` | Index text content into a tree |
| `indexFile(filePath, options?)` | Index a file (PDF*, MD, HTML, TXT) |
| `indexMarkdown(content, title)` | Index markdown content |
| `retrieve(tree, query)` | Retrieve relevant content |
| `search(tree, query)` | Search without content retrieval |
| `collectAllText(tree)` | Get all text from a tree |
| `getTreeStats(tree)` | Get tree statistics |
| `getTreeStructure(tree)` | Get printable tree structure |
| `findNodesByTitle(tree, query)` | Find nodes by title |
| `getNodeById(tree, nodeId)` | Get specific node |

*PDF parsing requires optional `@cyber2024/pdf-parse-fixed` package

### Return Types

```typescript
// Retrieval result
interface RetrievalResult {
  context: string;           // Formatted context for your LLM
  contents: RetrievedContent[]; // Raw retrieved items
  searchResult: {
    thinking: string;        // Search reasoning
    nodeList: string[];      // Matched node IDs
    searchTimeMs: number;    // Search duration
  };
  totalTimeMs: number;       // Total retrieval time
}

// Tree index (can be serialized/stored)
interface TreeIndex {
  title: string;
  description?: string;
  nodes: TreeNode[];
  createdAt: string;
  version: string;
}
```

## Advanced Usage

### Indexing Files

```typescript
// Index different file types
const pdfTree = await tot.indexFile('./document.pdf');  // Requires pdf-parse
const mdTree = await tot.indexFile('./readme.md');
const htmlTree = await tot.indexFile('./page.html');
const txtTree = await tot.indexFile('./notes.txt');
```

### Inspecting Tree Structure

```typescript
const tree = await tot.index(content, 'My Doc');

// Get statistics
console.log(tot.getTreeStats(tree));
// { nodeCount: 15, maxDepth: 3, title: 'My Doc', createdAt: '...' }

// Print tree structure
console.log(tot.getTreeStructure(tree));
// - My Doc [root123]
//   - Introduction [abc123]
//   - Chapter 1 [def456]
//     - Section 1.1 [ghi789]
```

### Serializing Trees

```typescript
// Trees are plain objects - serialize easily
const tree = await tot.index(content, 'My Doc');

// Save to file
fs.writeFileSync('tree.json', JSON.stringify(tree));

// Load later
const loadedTree = JSON.parse(fs.readFileSync('tree.json', 'utf-8'));
const result = await tot.retrieve(loadedTree, 'query');
```

### Custom Search Configuration

```typescript
const tot = new TreeOfThought({
  search: {
    maxResults: 5,  // Return fewer results
  },
  generator: {
    maxSummaryLength: 300,  // Longer summaries
  },
  debug: true,  // See what's happening
});
```

## Optional: LLM-Enhanced Search

For smarter retrieval, you can optionally add an LLM provider:

```bash
# Install your preferred provider
npm install openai  # or @anthropic-ai/sdk or @google/generative-ai
```

```typescript
import { TreeOfThought, createOpenAIProvider } from 'tree-of-thought';

const tot = new TreeOfThought({
  llm: createOpenAIProvider('gpt-4-turbo'),  // Requires OPENAI_API_KEY
});

// Now retrieval uses LLM reasoning instead of keyword matching
const result = await tot.retrieve(tree, 'complex query');
```

**But this is completely optional!** The library works great without any LLM.

## Comparison

| Feature | Tree-of-Thought | Vector RAG | Traditional Search |
|---------|-----------------|------------|-------------------|
| External Services | None required | Vector DB + Embedding API | Search engine |
| API Keys | None required | Required | May require |
| Setup Complexity | `npm install` | Complex | Varies |
| Offline Support | Yes | No | Depends |
| Cost | Free | Per-query costs | Varies |

## Use Cases

- **Documentation Search** - Index your docs for quick retrieval
- **Knowledge Base** - Build searchable knowledge bases
- **Chatbot Context** - Provide relevant context to chatbots
- **Content Management** - Organize and search content
- **Offline RAG** - Run RAG systems without internet

## Contributing

Contributions welcome! This is an open-source project.

1. Fork the repository
2. Create your feature branch
3. Submit a pull request

## License

MIT License - Use it however you want!

## Credits

Inspired by [VectifyAI/PageIndex](https://github.com/VectifyAI/PageIndex).

---

**No API keys. No vector databases. No external services. Just install and use.**

Built by [Gianne Bacay](https://github.com/yourusername)
