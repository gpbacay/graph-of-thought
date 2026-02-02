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
    enabled: boolean;
    ttlMs?: number;
  };
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
// Event Types
// ============================================================================

/**
 * Events emitted during tree operations
 */
export type ToTEventType =
  | 'tree:building'
  | 'tree:built'
  | 'search:started'
  | 'search:completed'
  | 'retrieval:started'
  | 'retrieval:completed'
  | 'error';

/**
 * Event payload
 */
export interface ToTEvent {
  type: ToTEventType;
  timestamp: string;
  data?: unknown;
}

/**
 * Event handler function
 */
export type ToTEventHandler = (event: ToTEvent) => void;
