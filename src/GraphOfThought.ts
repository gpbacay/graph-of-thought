/**
 * GraphOfThought - Enhanced document indexing and retrieval using graph structures
 * 
 * Implements Graph-of-Thought (GoT) approach with BMSSP algorithm for efficient
 * multi-source path finding in document graphs.
 */

import { GraphIndexer } from './core/GraphIndexer';
import { TreeGenerator } from './core/TreeGenerator';
import { SimpleSearch } from './core/SimpleSearch';
import { DocumentParser } from './core/DocumentParser';
import {
  GraphIndex,
  GraphIndexerConfig,
  GoTConfig,
  RetrievalResult,
  GoTEvent,
  GoTEventHandler
} from './types';

/**
 * Default configuration for GraphOfThought
 */
const DEFAULT_CONFIG: GoTConfig = {
  indexer: {
    maxDepth: 3,
    maxResults: 10,
    enableCrossReferences: true,
    precomputeRelationships: true,
    minEdgeWeight: 0.1
  },
  debug: false,
  cache: {
    enabled: false,
    ttlMs: 3600000 // 1 hour
  },
  hybridMode: {
    autoSwitchThreshold: 0.2,
    fallbackToTree: true
  }
};

/**
 * GraphOfThought - Main entry point for the enhanced library
 * 
 * Provides both graph-based and tree-based indexing with intelligent switching
 * based on document characteristics.
 * 
 * @example
 * ```typescript
 * // Basic usage with automatic mode selection
 * import { GraphOfThought } from 'graph-of-thought';
 * 
 * const got = new GraphOfThought({ debug: true });
 * const index = await got.index('Your document content...', 'My Document');
 * const result = await got.retrieve(index, 'Your query');
 * ```
 * 
 * @example
 * ```typescript
 * // Force graph mode for complex documents
 * const got = new GraphOfThought({ 
 *   indexer: { enableCrossReferences: true },
 *   hybridMode: { autoSwitchThreshold: 0 } // Always use graph
 * });
 * ```
 */
export class GraphOfThought {
  private graphIndexer: GraphIndexer;
  private treeGenerator: TreeGenerator;
  private simpleSearch: SimpleSearch;
  private parser: DocumentParser;
  private config: GoTConfig;
  private eventHandlers: GoTEventHandler[] = [];
  private indexCache: Map<string, GraphIndex> = new Map();

  constructor(options: GoTConfig = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, options);
    
    this.graphIndexer = new GraphIndexer(this.config.indexer);
    this.treeGenerator = new TreeGenerator();
    this.simpleSearch = new SimpleSearch();
    this.parser = new DocumentParser(this.treeGenerator);
    
    if (this.config.debug) {
      console.log('[GoT] Initialized with config:', this.config);
    }
  }

  /**
   * Index document content into appropriate structure (graph or tree)
   */
  async index(
    content: string, 
    title: string, 
    description?: string,
    options?: { forceMode?: 'graph' | 'tree' }
  ): Promise<GraphIndex> {
    const startTime = Date.now();
    
    this.emitEvent('index:building', { title, contentLength: content.length });
    
    let index: GraphIndex;
    
    if (options?.forceMode === 'graph') {
      // Force graph indexing
      index = await this.graphIndexer.index(content, title, description);
    } else if (options?.forceMode === 'tree') {
      // Force tree indexing (legacy compatibility)
      const treeIndex = await this.treeGenerator.generateTree(content, title, description);
      index = this.convertTreeToGraph(treeIndex);
    } else {
      // Auto-detect best approach
      const documentStats = this.analyzeDocument(content);
      const mode = this.selectIndexingMode(documentStats);
      
      if (this.config.debug) {
        console.log(`[GoT] Auto-selected ${mode} mode for document:`, documentStats);
      }
      
      if (mode === 'graph') {
        index = await this.graphIndexer.index(content, title, description);
      } else {
        const treeIndex = await this.treeGenerator.generateTree(content, title, description);
        index = this.convertTreeToGraph(treeIndex);
      }
    }

    // Cache if enabled
    if (this.config.cache?.enabled) {
      this.indexCache.set(title, index);
    }

    this.emitEvent('index:built', { 
      title, 
      indexType: index.metadata.indexType,
      nodeCount: index.nodes.length,
      edgeCount: index.edges.length,
      buildTimeMs: Date.now() - startTime 
    });

    return index;
  }

  /**
   * Index a file (PDF, Markdown, HTML, or text)
   */
  async indexFile(filePath: string, options?: any): Promise<GraphIndex> {
    const treeIndex = await this.parser.parseFile(filePath, options);
    return this.convertTreeToGraph(treeIndex);
  }

  /**
   * Retrieve relevant content using appropriate search method
   */
  async retrieve(index: GraphIndex, query: string): Promise<RetrievalResult> {
    const startTime = Date.now();
    
    this.emitEvent('retrieval:started', { query, indexTitle: index.title });
    
    // Use graph-based retrieval
    const graphResult = await this.graphIndexer.retrieve(index, query);
    
    this.emitEvent('retrieval:completed', { 
      query, 
      resultLength: graphResult.context.length,
      retrievalTimeMs: Date.now() - startTime 
    });
    
    return {
      context: graphResult.context,
      contents: graphResult.contents,
      searchResult: {
        thinking: graphResult.searchResult.paths.map(p => p.reasoning).join('\n'),
        nodeList: graphResult.searchResult.nodeList,
        searchTimeMs: graphResult.totalTimeMs
      },
      totalTimeMs: Date.now() - startTime
    };
  }

  /**
   * Search for relevant nodes/paths without content retrieval
   */
  async search(index: GraphIndex, query: string): Promise<any> {
    this.emitEvent('search:started', { query, indexTitle: index.title });
    const result = await this.graphIndexer.search(index, query);
    this.emitEvent('search:completed', { query, result });
    return result;
  }

  /**
   * Get document statistics and analysis
   */
  async analyzeDocument(content: string): Promise<{
    crossReferenceRatio: number;
    avgSectionLength: number;
    sectionCount: number;
    complexityScore: number;
  }> {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const sections = paragraphs.filter(p => 
      p.startsWith('#') || /^\d+\./.test(p.trim()) || p.length < 100
    );
    
    const crossReferences = paragraphs.filter(p => 
      p.includes('see') || p.includes('refer') || p.includes('section')
    ).length;
    
    const avgLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length;
    
    const complexityScore = Math.min(
      (crossReferences / paragraphs.length) * 2 + 
      (sections.length / paragraphs.length) * 0.5 +
      Math.min(avgLength / 500, 1),
      1
    );
    
    return {
      crossReferenceRatio: crossReferences / paragraphs.length,
      avgSectionLength: avgLength,
      sectionCount: sections.length,
      complexityScore
    };
  }

  /**
   * Get index statistics
   */
  getIndexStats(index: GraphIndex): {
    nodeCount: number;
    edgeCount: number;
    averageDegree: number;
    density: number;
    title: string;
  } {
    const nodeCount = index.nodes.length;
    const edgeCount = index.edges.length;
    const averageDegree = nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0;
    const maxEdges = nodeCount * (nodeCount - 1) / 2;
    const density = maxEdges > 0 ? edgeCount / maxEdges : 0;
    
    return {
      nodeCount,
      edgeCount,
      averageDegree,
      density,
      title: index.title
    };
  }

  /**
   * Add event listener
   */
  on(event: string, handler: GoTEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Get cached index by title
   */
  getCachedIndex(title: string): GraphIndex | undefined {
    return this.indexCache.get(title);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.indexCache.clear();
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private selectIndexingMode(documentStats: any): 'graph' | 'tree' {
    const threshold = this.config.hybridMode?.autoSwitchThreshold ?? 0.2;
    
    if (documentStats.complexityScore > threshold) {
      return 'graph';
    }
    
    if (this.config.hybridMode?.fallbackToTree) {
      return 'tree';
    }
    
    return 'graph';
  }

  private convertTreeToGraph(treeIndex: any): GraphIndex {
    // Convert tree structure to graph format for compatibility
    const nodes = treeIndex.nodes.map((node: any) => ({
      nodeId: node.nodeId,
      title: node.title,
      content: node.text || node.summary,
      summary: node.summary,
      type: 'section',
      position: { start: node.startIndex, end: node.endIndex },
      metadata: { level: 1 }
    }));

    // Create root document node
    const rootNode = {
      nodeId: `root_${Math.random().toString(36).substring(2, 8)}`,
      title: treeIndex.title,
      content: nodes.map((n: any) => n.content).join('\n\n'),
      summary: 'Root document node',
      type: 'document',
      position: { start: 0, end: nodes.length - 1 },
      metadata: { level: 0 }
    };

    nodes.unshift(rootNode);

    // Create parent-child edges
    const edges = nodes.slice(1).map((node: any) => ({
      from: rootNode.nodeId,
      to: node.nodeId,
      weight: 0.8,
      type: 'parent-child'
    }));

    return {
      title: treeIndex.title,
      description: treeIndex.description,
      nodes,
      edges,
      metadata: {
        createdAt: treeIndex.createdAt,
        version: treeIndex.version,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        indexType: 'graph'
      }
    };
  }

  private mergeConfig(defaults: GoTConfig, overrides: GoTConfig): GoTConfig {
    return {
      indexer: { ...defaults.indexer, ...overrides.indexer },
      debug: overrides.debug ?? defaults.debug,
      cache: { ...defaults.cache, ...overrides.cache },
      hybridMode: { ...defaults.hybridMode, ...overrides.hybridMode }
    };
  }

  private emitEvent(type: any, data: any): void {
    const event: GoTEvent = {
      type,
      timestamp: new Date().toISOString(),
      data
    };
    
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        if (this.config.debug) {
          console.error('[GoT] Error in event handler:', error);
        }
      }
    }
  }
}

/**
 * Type exports for enhanced functionality
 */
export type {
  GraphIndex,
  GraphNode,
  GraphEdge,
  GraphIndexerConfig,
  GoTConfig,
  PathResult
} from './types';