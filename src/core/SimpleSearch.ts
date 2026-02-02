/**
 * SimpleSearch - Keyword and scoring-based search (NO LLM required)
 *
 * Provides basic retrieval without any external dependencies or API keys.
 * Uses TF-IDF scoring and keyword matching for relevance ranking.
 */

import {
  TreeIndex,
  TreeNode,
  TreeSearchResult,
  RetrievedContent,
  RetrievalResult,
  TreeSearchConfig,
} from '../types';

/**
 * Default search configuration
 */
const DEFAULT_CONFIG: Required<TreeSearchConfig> = {
  temperature: 0, // Not used in simple search
  maxResults: 10,
  maxDepth: 5,
  includeParents: false,
  timeoutMs: 30000,
};

/**
 * SimpleSearch - Keyword-based tree search without LLM
 *
 * @example
 * ```typescript
 * const search = new SimpleSearch({ maxResults: 5 });
 * const result = await search.search(tree, 'installation guide');
 * ```
 */
export class SimpleSearch {
  private config: Required<TreeSearchConfig>;

  constructor(config: TreeSearchConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Search for relevant nodes using keyword matching and TF-IDF scoring
   */
  async search(tree: TreeIndex, query: string): Promise<TreeSearchResult> {
    const startTime = Date.now();
    const queryTerms = this.tokenize(query);
    const allNodes = this.flattenTree(tree.nodes);

    // Score each node
    const scoredNodes = allNodes.map((node) => ({
      node,
      score: this.scoreNode(node, queryTerms),
    }));

    // Sort by score and take top results
    const topNodes = scoredNodes
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.maxResults);

    const nodeList = topNodes.map((s) => s.node.nodeId);
    const thinking = this.generateThinking(query, topNodes);

    return {
      thinking,
      nodeList,
      searchTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Complete retrieval pipeline: search + content retrieval
   */
  async retrieve(tree: TreeIndex, query: string): Promise<RetrievalResult> {
    const startTime = Date.now();

    const searchResult = await this.search(tree, query);
    const contents = this.retrieveContent(tree, searchResult.nodeList);
    const context = this.formatContext(contents);

    return {
      context,
      contents,
      searchResult,
      totalTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Retrieve content from specific nodes
   */
  retrieveContent(tree: TreeIndex, nodeIds: string[]): RetrievedContent[] {
    const results: RetrievedContent[] = [];
    const allNodes = this.flattenTree(tree.nodes);

    for (const nodeId of nodeIds) {
      const node = allNodes.find((n) => n.nodeId === nodeId);
      if (node) {
        results.push({
          nodeId: node.nodeId,
          title: node.title,
          text: node.text || node.summary,
          summary: node.summary,
        });
      }
    }

    return results;
  }

  /**
   * Format retrieved content for use in prompts
   */
  formatContext(contents: RetrievedContent[]): string {
    if (contents.length === 0) return '';
    return contents.map((c) => `### ${c.title}\n${c.text}`).join('\n\n');
  }

  /**
   * Collect all text from a tree
   */
  collectAllText(tree: TreeIndex): string {
    const texts: string[] = [];

    const collect = (node: TreeNode): void => {
      if (node.text) {
        texts.push(`## ${node.title}\n${node.text}`);
      } else if (node.summary) {
        texts.push(`## ${node.title}\n${node.summary}`);
      }
      for (const child of node.children) {
        collect(child);
      }
    };

    for (const node of tree.nodes) {
      collect(node);
    }

    return texts.join('\n\n');
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  /**
   * Tokenize text into lowercase terms
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((term) => term.length > 1);
  }

  /**
   * Score a node based on query terms using TF-IDF-like scoring
   */
  private scoreNode(node: TreeNode, queryTerms: string[]): number {
    const titleTerms = this.tokenize(node.title);
    const summaryTerms = this.tokenize(node.summary);
    const textTerms = node.text ? this.tokenize(node.text) : [];

    let score = 0;

    for (const queryTerm of queryTerms) {
      // Title matches (highest weight)
      if (titleTerms.includes(queryTerm)) {
        score += 10;
      }
      // Exact title contains query term
      if (node.title.toLowerCase().includes(queryTerm)) {
        score += 5;
      }
      // Summary matches (medium weight)
      const summaryCount = summaryTerms.filter((t) => t === queryTerm).length;
      score += summaryCount * 2;
      // Text matches (lower weight, but accumulates)
      const textCount = textTerms.filter((t) => t === queryTerm).length;
      score += Math.min(textCount * 0.5, 5); // Cap text contribution
    }

    // Bonus for phrase matching in title
    const queryPhrase = queryTerms.join(' ');
    if (node.title.toLowerCase().includes(queryPhrase)) {
      score += 15;
    }

    return score;
  }

  /**
   * Generate human-readable thinking/reasoning
   */
  private generateThinking(
    query: string,
    scoredNodes: { node: TreeNode; score: number }[]
  ): string {
    if (scoredNodes.length === 0) {
      return `No matching nodes found for query: "${query}"`;
    }

    const topMatches = scoredNodes
      .slice(0, 3)
      .map((s) => `"${s.node.title}" (score: ${s.score.toFixed(1)})`)
      .join(', ');

    return `Found ${scoredNodes.length} relevant nodes for "${query}". Top matches: ${topMatches}. Matching based on keyword overlap in titles, summaries, and content.`;
  }

  /**
   * Flatten tree into array of nodes
   */
  private flattenTree(nodes: TreeNode[]): TreeNode[] {
    const result: TreeNode[] = [];

    const traverse = (nodeList: TreeNode[]) => {
      for (const node of nodeList) {
        result.push(node);
        if (node.children.length > 0) {
          traverse(node.children);
        }
      }
    };

    traverse(nodes);
    return result;
  }
}
