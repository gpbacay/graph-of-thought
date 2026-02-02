# Tree-of-Thought Examples

**All examples work without any API keys!**

## Examples

### basic-usage.ts
Simple demonstration of indexing and retrieval - no external dependencies.

```bash
npx ts-node examples/basic-usage.ts
```

### rag-integration.ts
Shows how to integrate Tree-of-Thought into an existing RAG system.

```bash
npx ts-node examples/rag-integration.ts
```

### serialize-trees.ts
Demonstrates saving and loading tree indexes for persistence.

```bash
npx ts-node examples/serialize-trees.ts
```

## Setup

1. Install dependencies:
```bash
cd tree-of-thought
npm install
```

2. Run an example:
```bash
npx ts-node examples/basic-usage.ts
```

**No API keys needed!**

## Basic Pattern

```typescript
import { TreeOfThought } from 'tree-of-thought';

// 1. Create instance (no config needed)
const tot = new TreeOfThought();

// 2. Index your document
const tree = await tot.index(content, 'Title');

// 3. Retrieve relevant content
const result = await tot.retrieve(tree, 'Your query');

// 4. Use the context in your application
console.log(result.context);
```

## Integration Pattern

```typescript
// In your existing RAG system
class MyRAG {
  private tot = new TreeOfThought();
  private trees = new Map();

  async addDoc(content, name) {
    this.trees.set(name, await this.tot.index(content, name));
  }

  async getContext(query) {
    const contexts = [];
    for (const tree of this.trees.values()) {
      const result = await this.tot.retrieve(tree, query);
      contexts.push(result.context);
    }
    return contexts.join('\n\n');
  }
}
```
