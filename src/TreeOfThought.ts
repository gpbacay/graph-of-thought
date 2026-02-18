/**
 * TreeOfThought - Vectorless, reasoning-based document indexing and retrieval
 *
 * Works COMPLETELY STANDALONE - no API keys, no external services required.
 * LLM-based reasoning is OPTIONAL for enhanced retrieval.
 */

import { TreeGenerator } from './core/TreeGenerator';
import { TreeSearch } from './core/TreeSearch';
import { SimpleSearch } from './core/SimpleSearch';
import { DocumentParser } from './core/DocumentParser';
import {
  TreeIndex,
  RetrievalResult,
  TreeSearchResult,
  ExpertKnowledge,
  ToTConfig,
  LLMProvider,
  ParseOptions,
  TreeNode,
} from './types';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ToTConfig = {
  generator: {
    maxPagesPerNode: 10,
    maxTokensPerNode: 20000,
    addNodeSummary: true,
    maxSummaryLength: 200,
  },
  search: {
    temperature: 0.1,
    maxResults: 10,
    maxDepth: 5,
    includeParents: false,
    timeoutMs: 30000,
  },
  debug: false,
  cache: {
    enabled: false,
  },
};

/**
 * TreeOfThought - The main entry point for the library
 *
 * Works standalone without any API keys or external services.
 * Optionally accepts an LLM provider for enhanced reasoning-based search.
 *
 * @example
 * ```typescript
 * // SIMPLE USAGE - No API keys needed!
 * import { TreeOfThought } from 'tree-of-thought';
 *
 * const tot = new TreeOfThought();
 * const tree = await tot.index('Your document...', 'My Document');
 * const result = await tot.retrieve(tree, 'What is this about?');
 * ```
 *
 * @example
 * ```typescript
 * // ENHANCED USAGE - With optional LLM for better reasoning
 * import { TreeOfThought, createOpenAIProvider } from 'tree-of-thought';
 *
 * const tot = new TreeOfThought({
 *   llm: createOpenAIProvider('gpt-4-turbo'),
 * });
 * ```
 */
export class TreeOfThought {
  private generator: TreeGenerator;
  private keywordSearch: SimpleSearch;
  private llmSearch: TreeSearch | null = null;
  private parser: DocumentParser;
  private config: ToTConfig;
  private treeCache: Map<string, TreeIndex>;
  private useLLM: boolean = false;

  constructor(options: ToTConfig & { llm?: LLMProvider } = {}) {
    const { llm, ...config } = options;
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);

    this.generator = new TreeGenerator(this.config.generator);
    this.keywordSearch = new SimpleSearch(this.config.search);
    this.parser = new DocumentParser(this.generator);
    this.treeCache = new Map();

    // Optional LLM for enhanced search
    if (llm) {
      this.llmSearch = new TreeSearch(llm, this.config.search);
      this.useLLM = true;
    }

    if (this.config.debug) {
      console.log('[ToT] Initialized');
      console.log('[ToT] LLM mode:', this.useLLM ? 'enabled' : 'disabled (standalone)');
    }
  }

  /**
   * Enable or disable LLM-based search (if LLM provider was configured)
   */
  setUseLLM(enabled: boolean): void {
    if (enabled && !this.llmSearch) {
      console.warn('[ToT] LLM provider not configured. Using keyword search.');
      return;
    }
    this.useLLM = enabled;
  }

  /**
   * Add an LLM provider for enhanced search (optional)
   */
  setLLMProvider(provider: LLMProvider, expertKnowledge?: ExpertKnowledge): void {
    this.llmSearch = new TreeSearch(provider, this.config.search, expertKnowledge);
    this.useLLM = true;
  }

  /**
   * Index text content into a tree structure
   * NO API KEYS REQUIRED
   */
  async index(content: string, title: string, description?: string): Promise<TreeIndex> {
    const startTime = Date.now();

    if (this.config.debug) {
      console.log(`[ToT] Indexing document: ${title}`);
    }

    const tree = await this.generator.generateTree(content, title, description);

    if (this.config.cache?.enabled) {
      this.treeCache.set(title, tree);
    }

    if (this.config.debug) {
      const nodeCount = TreeGenerator.countNodes(tree.nodes);
      const depth = TreeGenerator.getMaxDepth(tree.nodes);
      console.log(`[ToT] Indexed ${nodeCount} nodes, depth ${depth}, took ${Date.now() - startTime}ms`);
    }

    return tree;
  }

  /**
   * Index a file (PDF, Markdown, HTML, or text)
   * NO API KEYS REQUIRED
   */
  async indexFile(filePath: string, options?: ParseOptions): Promise<TreeIndex> {
    const startTime = Date.now();

    if (this.config.debug) {
      console.log(`[ToT] Indexing file: ${filePath}`);
    }

    const tree = await this.parser.parseFile(filePath, options);

    if (this.config.cache?.enabled && options?.title) {
      this.treeCache.set(options.title, tree);
    }

    if (this.config.debug) {
      const nodeCount = TreeGenerator.countNodes(tree.nodes);
      console.log(`[ToT] Indexed ${nodeCount} nodes from file, took ${Date.now() - startTime}ms`);
    }

    return tree;
  }

  /**
   * Index a PDF buffer
   */
  async indexPdfBuffer(buffer: Buffer, title: string, description?: string): Promise<TreeIndex> {
    return this.parser.parsePdfBuffer(buffer, title, description);
  }

  /**
   * Index markdown content
   */
  async indexMarkdown(content: string, title: string, description?: string): Promise<TreeIndex> {
    return this.parser.parseMarkdown(content, title, description);
  }

  /**
   * Retrieve relevant content for a query
   * Uses simple keyword search by default, LLM reasoning if configured
   */
  async retrieve(tree: TreeIndex, query: string): Promise<RetrievalResult> {
    if (this.config.debug) {
      console.log(`[ToT] Retrieving for: "${query.substring(0, 50)}..." (LLM: ${this.useLLM})`);
    }

    // Use LLM search if available and enabled, otherwise use simple search
    if (this.useLLM && this.llmSearch) {
      return this.llmSearch.retrieve(tree, query);
    }

    return this.keywordSearch.retrieve(tree, query);
  }

  /**
   * Search for relevant nodes (without content retrieval)
   */
  async search(tree: TreeIndex, query: string): Promise<TreeSearchResult> {
    if (this.useLLM && this.llmSearch) {
      return this.llmSearch.search(tree, query);
    }
    return this.keywordSearch.search(tree, query);
  }

  /**
   * Get all text from a tree (for full context scenarios)
   */
  collectAllText(tree: TreeIndex): string {
    return this.keywordSearch.collectAllText(tree);
  }

  /**
   * Set expert knowledge for LLM-based retrieval
   */
  setExpertKnowledge(knowledge: ExpertKnowledge): void {
    if (this.llmSearch) {
      this.llmSearch.setExpertKnowledge(knowledge);
    }
  }

  /**
   * Get a cached tree by title
   */
  getCachedTree(title: string): TreeIndex | undefined {
    return this.treeCache.get(title);
  }

  /**
   * Clear the tree cache
   */
  clearCache(): void {
    this.treeCache.clear();
  }

  /**
   * Get tree statistics
   */
  getTreeStats(tree: TreeIndex): {
    nodeCount: number;
    maxDepth: number;
    title: string;
    createdAt: string;
  } {
    return {
      nodeCount: TreeGenerator.countNodes(tree.nodes),
      maxDepth: TreeGenerator.getMaxDepth(tree.nodes),
      title: tree.title,
      createdAt: tree.createdAt,
    };
  }

  /**
   * Get the tree structure for inspection/debugging
   */
  getTreeStructure(tree: TreeIndex): string {
    const formatNode = (node: TreeNode, indent: number = 0): string => {
      const prefix = '  '.repeat(indent);
      let result = `${prefix}- ${node.title} [${node.nodeId}]`;
      if (node.children.length > 0) {
        result += '\n' + node.children.map((n) => formatNode(n, indent + 1)).join('\n');
      }
      return result;
    };

    return tree.nodes.map((n) => formatNode(n, 0)).join('\n');
  }

  /**
   * Find nodes by title (partial match)
   */
  findNodesByTitle(tree: TreeIndex, titleQuery: string): TreeNode[] {
    const results: TreeNode[] = [];
    const query = titleQuery.toLowerCase();

    const traverse = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.title.toLowerCase().includes(query)) {
          results.push(node);
        }
        if (node.children.length > 0) {
          traverse(node.children);
        }
      }
    };

    traverse(tree.nodes);
    return results;
  }

  /**
   * Get a specific node by ID
   */
  getNodeById(tree: TreeIndex, nodeId: string): TreeNode | null {
    const findNode = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.nodeId === nodeId) return node;
        if (node.children.length > 0) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findNode(tree.nodes);
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private mergeConfig(defaults: ToTConfig, overrides: ToTConfig): ToTConfig {
    return {
      generator: { ...defaults.generator, ...overrides.generator },
      search: { ...defaults.search, ...overrides.search },
      debug: overrides.debug ?? defaults.debug,
      cache: { ...defaults.cache, ...overrides.cache },
    };
  }
}

/**
 * Create pre-configured expert knowledge for common domains
 * (Only used when LLM provider is configured)
 */
export const ExpertKnowledgePresets = {
  general: (): ExpertKnowledge => ({
    domain: 'General',
    rules: [
      'For questions about specific topics: find sections with matching titles',
      'For overview questions: prioritize introduction or summary sections',
      'For detailed information: prioritize specific subsections over general ones',
    ],
  }),

  technical: (): ExpertKnowledge => ({
    domain: 'Technical Documentation',
    rules: [
      'For API questions: prioritize API Reference, Methods, or Functions sections',
      'For setup questions: prioritize Installation, Configuration, or Getting Started',
      'For examples: prioritize Examples, Usage, or Code Samples sections',
      'For troubleshooting: prioritize FAQ, Troubleshooting, or Common Issues',
    ],
  }),

  legal: (): ExpertKnowledge => ({
    domain: 'Legal',
    rules: [
      'For definitions: prioritize Definitions or Glossary sections',
      'For obligations: prioritize Responsibilities or Duties sections',
      'For limitations: prioritize Limitations or Exclusions sections',
    ],
  }),

  academic: (): ExpertKnowledge => ({
    domain: 'Academic',
    rules: [
      'For main findings: prioritize Results or Conclusions sections',
      'For methodology: prioritize Methods or Materials sections',
      'For context: prioritize Introduction or Background sections',
    ],
  }),

  portfolio: (): ExpertKnowledge => ({
    domain: 'Portfolio',
    rules: [
      'For skills: prioritize Skills or Technologies sections',
      'For experience: prioritize Experience or Work History sections',
      'For projects: prioritize Projects or Portfolio sections',
    ],
  }),
};
