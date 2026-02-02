/**
 * Tree-of-Thought (ToT)
 *
 * Vectorless, reasoning-based document indexing and retrieval.
 *
 * WORKS STANDALONE - No API keys or external services required!
 * LLM providers are OPTIONAL for enhanced reasoning-based search.
 *
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * // Basic usage - NO API keys needed
 * import { TreeOfThought } from 'tree-of-thought';
 *
 * const tot = new TreeOfThought();
 * const tree = await tot.index('Your document content...', 'My Doc');
 * const result = await tot.retrieve(tree, 'Your query');
 * console.log(result.context);
 * ```
 */

// Main class
export { TreeOfThought, ExpertKnowledgePresets } from './TreeOfThought';

// Core modules (all work standalone)
export { TreeGenerator } from './core/TreeGenerator';
export { SimpleSearch } from './core/SimpleSearch';
export { DocumentParser } from './core/DocumentParser';

// LLM-enhanced search (optional - requires LLM provider)
export { TreeSearch } from './core/TreeSearch';

// Optional providers (only import if you want LLM-enhanced search)
export {
  OpenAIProvider,
  createOpenAIProvider,
  AnthropicProvider,
  createAnthropicProvider,
  GoogleProvider,
  createGoogleProvider,
} from './providers';

// Types
export type {
  // Tree types
  TreeNode,
  DocumentNode,
  TreeIndex,

  // Search types
  TreeSearchResult,
  RetrievedContent,
  RetrievalResult,

  // Config types
  ExpertKnowledge,
  TreeGeneratorConfig,
  TreeSearchConfig,
  ToTConfig,

  // LLM types (optional)
  LLMProvider,
  LLMMessage,
  LLMGenerateOptions,
  LLMResponse,

  // Parser types
  DocumentFormat,
  ParseOptions,
} from './types';

// Provider config types (optional)
export type {
  OpenAIProviderConfig,
  AnthropicProviderConfig,
  GoogleProviderConfig,
} from './providers';

// Utilities
export { TreeCache, createFileKey } from './utils';
