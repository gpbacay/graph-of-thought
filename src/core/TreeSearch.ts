/**
 * TreeSearch - LLM-powered reasoning-based tree search
 *
 * The core innovation of Tree-of-Thought: using LLM reasoning to navigate
 * the tree structure instead of vector similarity search
 */

import {
  TreeIndex,
  TreeNode,
  TreeSearchResult,
  RetrievedContent,
  RetrievalResult,
  ExpertKnowledge,
  TreeSearchConfig,
  LLMProvider,
} from '../types';

/**
 * Default search configuration
 */
const DEFAULT_CONFIG: Required<TreeSearchConfig> = {
  temperature: 0.1,
  maxResults: 10,
  maxDepth: 5,
  includeParents: false,
  timeoutMs: 30000,
};

/**
 * Default expert knowledge (generic)
 */
const DEFAULT_EXPERT_KNOWLEDGE: ExpertKnowledge = {
  domain: 'General',
  rules: [
    'For questions about specific topics: find sections with matching titles',
    'For overview questions: prioritize introduction or summary sections',
    'For detailed information: prioritize specific subsections over general ones',
    'When multiple sections might be relevant: include all of them',
  ],
};

/**
 * TreeSearch performs LLM-based reasoning over tree structures
 *
 * @example
 * ```typescript
 * const search = new TreeSearch(llmProvider, {
 *   temperature: 0.1,
 *   maxResults: 5,
 * });
 *
 * const result = await search.search(tree, 'What are the main features?');
 * ```
 */
export class TreeSearch {
  private llm: LLMProvider;
  private config: Required<TreeSearchConfig>;
  private expertKnowledge: ExpertKnowledge;

  constructor(
    llmProvider: LLMProvider,
    config: TreeSearchConfig = {},
    expertKnowledge: ExpertKnowledge = DEFAULT_EXPERT_KNOWLEDGE
  ) {
    this.llm = llmProvider;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.expertKnowledge = expertKnowledge;
  }

  /**
   * Updates the expert knowledge for domain-specific retrieval
   */
  public setExpertKnowledge(knowledge: ExpertKnowledge): void {
    this.expertKnowledge = knowledge;
  }

  /**
   * Performs LLM-based tree search to find relevant nodes
   *
   * @param tree - The tree index to search
   * @param query - User's query
   * @returns Search result with reasoning and node IDs
   */
  public async search(
    tree: TreeIndex,
    query: string
  ): Promise<TreeSearchResult> {
    const startTime = Date.now();
    const treeStructure = this.formatTreeForPrompt(tree);

    const prompt = this.buildSearchPrompt(query, treeStructure);

    try {
      const response = await this.llm.generate(prompt, {
        temperature: this.config.temperature,
        maxTokens: 1000,
      });

      const parsed = this.parseSearchResponse(response.text);

      return {
        ...parsed,
        searchTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[TreeSearch] Error during search:', error);

      // Fallback: return root nodes
      return {
        thinking: 'Search failed, returning root nodes as fallback',
        nodeList: tree.nodes.map((n) => n.nodeId),
        searchTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Complete retrieval pipeline: search + content retrieval
   *
   * @param tree - The tree index
   * @param query - User's query
   * @returns Complete retrieval result with formatted context
   */
  public async retrieve(
    tree: TreeIndex,
    query: string
  ): Promise<RetrievalResult> {
    const startTime = Date.now();

    // Step 1: Search for relevant nodes
    const searchResult = await this.search(tree, query);

    // Step 2: Retrieve content from nodes
    const contents = this.retrieveContent(tree, searchResult.nodeList);

    // Step 3: Format context
    const context = this.formatContext(contents);

    return {
      context,
      contents,
      searchResult,
      totalTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Retrieves content from specific nodes
   */
  public retrieveContent(tree: TreeIndex, nodeIds: string[]): RetrievedContent[] {
    const results: RetrievedContent[] = [];

    for (const nodeId of nodeIds.slice(0, this.config.maxResults)) {
      const node = this.findNodeById(tree.nodes, nodeId);
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
   * Formats retrieved content for use in prompts
   */
  public formatContext(contents: RetrievedContent[]): string {
    if (contents.length === 0) {
      return '';
    }

    return contents
      .map((c) => `### ${c.title}\n${c.text}`)
      .join('\n\n');
  }

  /**
   * Collects all text from a tree (for full context scenarios)
   */
  public collectAllText(tree: TreeIndex): string {
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
   * Formats tree structure for the LLM prompt
   */
  private formatTreeForPrompt(tree: TreeIndex): string {
    const formatNode = (node: TreeNode, indent: number = 0): string => {
      const prefix = '  '.repeat(indent);
      let result = `${prefix}- [${node.nodeId}] ${node.title}`;

      if (node.summary) {
        const truncatedSummary =
          node.summary.length > 150
            ? node.summary.substring(0, 150) + '...'
            : node.summary;
        result += `\n${prefix}  Summary: ${truncatedSummary}`;
      }

      if (node.children.length > 0) {
        result +=
          '\n' + node.children.map((n) => formatNode(n, indent + 1)).join('\n');
      }

      return result;
    };

    let output = `Document: ${tree.title}\n`;
    if (tree.description) {
      output += `Description: ${tree.description}\n`;
    }
    output += '\nStructure:\n';
    output += tree.nodes.map((n) => formatNode(n, 0)).join('\n');

    return output;
  }

  /**
   * Builds the search prompt
   */
  private buildSearchPrompt(query: string, treeStructure: string): string {
    return `You are given a query and the tree structure of a document.
You need to find all nodes that are likely to contain the answer.

Query: ${query}

Document tree structure:
${treeStructure}

Expert Knowledge for this domain (${this.expertKnowledge.domain}):
${this.expertKnowledge.rules.map((r) => `- ${r}`).join('\n')}

Instructions:
1. Analyze the query to understand what information is being requested
2. Review the tree structure and node summaries
3. Use the expert knowledge to guide your selection
4. Select nodes that are most likely to contain relevant information
5. Prefer specific leaf nodes over general parent nodes when possible
6. Include parent nodes only if they contain unique information not in children

Reply in the following JSON format (and ONLY this JSON, no other text):
{
  "thinking": "<your step-by-step reasoning about which nodes are relevant and why>",
  "node_list": ["nodeId1", "nodeId2", ...]
}`;
  }

  /**
   * Parses the LLM response to extract search results
   */
  private parseSearchResponse(responseText: string): TreeSearchResult {
    const text = responseText.trim();

    // Strategy 1: Direct JSON parse
    try {
      const parsed = JSON.parse(text);
      if (parsed.thinking !== undefined || parsed.node_list !== undefined) {
        return {
          thinking: parsed.thinking || '',
          nodeList: Array.isArray(parsed.node_list) ? parsed.node_list : [],
        };
      }
    } catch {
      // Continue to fallback strategies
    }

    // Strategy 2: Extract from markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1].trim());
        return {
          thinking: parsed.thinking || '',
          nodeList: Array.isArray(parsed.node_list) ? parsed.node_list : [],
        };
      } catch {
        // Continue to next strategy
      }
    }

    // Strategy 3: Find JSON object pattern
    const jsonMatch = text.match(/\{[\s\S]*"thinking"[\s\S]*"node_list"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          thinking: parsed.thinking || '',
          nodeList: Array.isArray(parsed.node_list) ? parsed.node_list : [],
        };
      } catch {
        // Continue to next strategy
      }
    }

    // Strategy 4: Regex extraction as last resort
    const nodeIdsMatch = text.match(/"node_list"\s*:\s*\[([\s\S]*?)\]/);
    const thinkingMatch = text.match(/"thinking"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);

    if (nodeIdsMatch) {
      const nodeIds =
        nodeIdsMatch[1].match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, '')) ||
        [];

      return {
        thinking: thinkingMatch
          ? thinkingMatch[1].replace(/\\"/g, '"')
          : 'Extracted from partial response',
        nodeList: nodeIds,
      };
    }

    // Complete failure
    throw new Error('Failed to parse search response');
  }

  /**
   * Finds a node by ID in the tree
   */
  private findNodeById(nodes: TreeNode[], nodeId: string): TreeNode | null {
    for (const node of nodes) {
      if (node.nodeId === nodeId) {
        return node;
      }
      if (node.children.length > 0) {
        const found = this.findNodeById(node.children, nodeId);
        if (found) return found;
      }
    }
    return null;
  }
}
