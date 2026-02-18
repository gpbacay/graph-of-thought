/**
 * Tree-of-Thought (ToT) - Core Type Definitions
 * Vectorless, Reasoning-based RAG with LLM Tree Search
 *
 * @packageDocumentation
 */

// ============================================================================
// Tree Structure Types
// ============================================================================

/**
 * A node in the Tree-of-Thought structure
 * Each node represents a section of content with hierarchical relationships
 */
export interface TreeNode {
  /** Unique identifier for this node */
  nodeId: string;
  /** Title or heading of this section */
  title: string;
  /** Summary of the content (used for tree search) */
  summary: string;
  /** Full text content of this node (used for retrieval) */
  text?: string;
  /** Starting index in the original document */
  startIndex: number;
  /** Ending index in the original document */
  endIndex: number;
  /** Child nodes */
  children: TreeNode[];
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Internal document node used during parsing
 * Contains additional fields for building the tree
 */
export interface DocumentNode extends TreeNode {
  /** Raw content paragraphs */
  content: string[];
  /** Hierarchical level (1 = top level) */
  level: number;
}

/**
 * The complete tree index representing a document's structure
 * Similar to a "Table of Contents" optimized for LLM reasoning
 */
export interface TreeIndex {
  /** Title of the indexed document */
  title: string;
  /** Optional description */
  description?: string;
  /** Root nodes of the tree */
  nodes: TreeNode[];
  /** ISO timestamp of when the index was created */
  createdAt: string;
  /** Version of the tree structure format */
  version: string;
  /** Optional source information */
  source?: {
    type: 'text' | 'markdown' | 'pdf' | 'html';
    path?: string;
  };
}

// ============================================================================
// Search Types
// ============================================================================

/**
 * Result from the LLM tree search
 * Contains the reasoning process and identified relevant nodes
 */
export interface TreeSearchResult {
  /** LLM's step-by-step reasoning about which nodes are relevant */
  thinking: string;
  /** List of node IDs identified as relevant */
  nodeList: string[];
  /** Confidence score (0-1) if available */
  confidence?: number;
  /** Time taken for the search in milliseconds */
  searchTimeMs?: number;
}

/**
 * Retrieved content from a tree node
 */
export interface RetrievedContent {
  /** Node identifier */
  nodeId: string;
  /** Node title */
  title: string;
  /** Full text content */
  text: string;
  /** Summary of the content */
  summary: string;
  /** Relevance score if available */
  relevanceScore?: number;
}

/**
 * Complete retrieval result
 */
export interface RetrievalResult {
  /** Formatted context string for use in prompts */
  context: string;
  /** Raw retrieved content items */
  contents: RetrievedContent[];
  /** Search result with reasoning */
  searchResult: TreeSearchResult;
  /** Total retrieval time in milliseconds */
  totalTimeMs: number;
}

// ============================================================================
// Expert Knowledge Types
// ============================================================================

/**
 * Domain-specific knowledge to guide the tree search
 * Helps the LLM make better decisions about which nodes are relevant
 */
export interface ExpertKnowledge {
  /** Domain name (e.g., "Medical", "Legal", "Technical") */
  domain: string;
  /** Retrieval rules/guidelines for this domain */
  rules: string[];
  /** Optional keywords that indicate relevance */
  keywords?: string[];
  /** Optional node title patterns to prioritize */
  priorityPatterns?: string[];
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for tree generation
 */
export interface TreeGeneratorConfig {
  /** Maximum pages/sections per node before splitting */
  maxPagesPerNode?: number;
  /** Maximum tokens per node content */
  maxTokensPerNode?: number;
  /** Whether to generate summaries for nodes */
  addNodeSummary?: boolean;
  /** Maximum summary length in characters */
  maxSummaryLength?: number;
  /** Custom heading detection patterns */
  headingPatterns?: RegExp[];
}

/**
 * Configuration for tree search
 */
export interface TreeSearchConfig {
  /** Temperature for LLM generation (lower = more deterministic) */
  temperature?: number;
  /** Maximum nodes to return */
  maxResults?: number;
  /** Maximum depth to search in the tree */
  maxDepth?: number;
  /** Whether to include parent nodes when children match */
  includeParents?: boolean;
  /** Timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * Main configuration for Tree-of-Thought
 */
export interface ToTConfig {
  /** Tree generator configuration */
  generator?: TreeGeneratorConfig;
  /** Tree search configuration */
  search?: TreeSearchConfig;
  /** Enable debug logging */
  debug?: boolean;
  /** Cache configuration */
  cache?: {
    enabled?: boolean;
    ttlMs?: number;
  };
}

/**
 * Main configuration for Graph-of-Thought
 */
export interface GoTConfig {
  /** Graph indexer configuration */
  indexer?: GraphIndexerConfig;
  /** Enable debug logging */
  debug?: boolean;
  /** Cache configuration */
  cache?: {
    enabled?: boolean;
    ttlMs?: number;
  };
  /** Hybrid mode configuration */
  hybridMode?: {
    /** Threshold for switching to graph mode (0-1) */
    autoSwitchThreshold?: number;
    /** Fallback to tree mode for simple documents */
    fallbackToTree?: boolean;
    /** Enable dynamic tree formation during retrieval */
    enableDynamicTrees?: boolean;
    /** Optimize for simple documents */
    optimizeForSimpleDocs?: boolean;
  };
  /** Indexing strategy to use */
  indexingStrategy?: 'graph-only' | 'hybrid' | 'auto-select';
}

// ============================================================================
// LLM Provider Types
// ============================================================================

/**
 * Standard message format for LLM communication
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Options for LLM generation
 */
export interface LLMGenerateOptions {
  /** Temperature (0-2, lower = more deterministic) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Stop sequences */
  stopSequences?: string[];
}

/**
 * LLM generation response
 */
export interface LLMResponse {
  /** Generated text */
  text: string;
  /** Token usage information */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Model used */
  model?: string;
}

/**
 * Abstract interface for LLM providers
 * Implement this to add support for new LLM services
 */
export interface LLMProvider {
  /** Provider name (e.g., "openai", "anthropic", "google") */
  readonly name: string;

  /**
   * Generate a completion from the LLM
   * @param prompt - The prompt to send
   * @param options - Generation options
   * @returns The generated response
   */
  generate(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse>;

  /**
   * Generate a completion from messages
   * @param messages - Array of messages
   * @param options - Generation options
   * @returns The generated response
   */
  chat?(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<LLMResponse>;
}

// ============================================================================
// Parser Types
// ============================================================================

/**
 * Supported document formats
 */
export type DocumentFormat = 'text' | 'markdown' | 'pdf' | 'html';

/**
 * Options for document parsing
 */
export interface ParseOptions {
  /** Title to use for the document */
  title?: string;
  /** Description of the document */
  description?: string;
  /** Document format (auto-detected if not provided) */
  format?: DocumentFormat;
  /** Encoding for text files */
  encoding?: BufferEncoding;
}

// ============================================================================
// Graph Types (GoT)
// ============================================================================

/**
 * Node in a graph-based document index
 */
export interface GraphNode {
  /** Unique identifier for this node */
  nodeId: string;
  /** Title or heading of this section */
  title: string;
  /** Full content of this node */
  content: string;
  /** Summary of the content */
  summary: string;
  /** Type of node */
  type: 'document' | 'section' | 'paragraph' | 'reference';
  /** Position in original document */
  position: {
    start: number;
    end: number;
  };
  /** Optional metadata */
  metadata?: {
    level?: number;
    keywords?: string[];
    centrality?: number;
    [key: string]: unknown;
  };
  /** Relevance score for search results */
  relevanceScore?: number;
}

/**
 * Edge representing relationship between nodes
 */
export interface GraphEdge {
  /** Source node ID */
  from: string;
  /** Target node ID */
  to: string;
  /** Weight of the relationship (0-1) */
  weight: number;
  /** Type of relationship */
  type: 'parent-child' | 'semantic' | 'reference' | 'cross-link';
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Graph-based document index
 */
export interface GraphIndex {
  /** Title of the indexed document */
  title: string;
  /** Optional description */
  description?: string;
  /** Nodes in the graph */
  nodes: GraphNode[];
  /** Edges representing relationships */
  edges: GraphEdge[];
  /** Metadata about the index */
  metadata: {
    createdAt: string;
    version: string;
    nodeCount: number;
    edgeCount: number;
    indexType: 'graph';
    [key: string]: unknown;
  };
}

/**
 * Configuration for graph indexing
 */
export interface GraphIndexerConfig {
  /** Maximum search depth */
  maxDepth?: number;
  /** Maximum results to return */
  maxResults?: number;
  /** Enable cross-references between sections */
  enableCrossReferences?: boolean;
  /** Pre-compute relationship metrics */
  precomputeRelationships?: boolean;
  /** Minimum edge weight to consider */
  minEdgeWeight?: number;
}

/**
 * Options for BMSSP algorithm
 */
export interface BMSSPOptions {
  /** Maximum search depth */
  maxDepth?: number;
  /** Maximum number of results */
  maxResults?: number;
  /** Minimum edge weight threshold */
  minEdgeWeight?: number;
}

/**
 * Result from path finding algorithm
 */
export interface PathResult {
  /** Node IDs in the path */
  nodeIds: string[];
  /** Total distance/weight of the path */
  distance: number;
  /** Overall path score (0-1) */
  pathScore: number;
  /** Human-readable reasoning */
  reasoning: string;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Events emitted during tree/graph operations
 */
export type GoTEventType =
  | 'index:building'
  | 'index:built'
  | 'search:started'
  | 'search:completed'
  | 'retrieval:started'
  | 'retrieval:completed'
  | 'error';

/**
 * Event payload
 */
export interface GoTEvent {
  type: GoTEventType;
  timestamp: string;
  data?: unknown;
}

/**
 * Event handler function
 */
export type GoTEventHandler = (event: GoTEvent) => void;
