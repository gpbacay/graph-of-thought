/**
 * GraphIndexer - Core module for creating graph-based document indexes
 * Implements Graph-of-Thought approach with cross-references and relationships
 */

import { GraphNode, GraphEdge, GraphIndex, GraphIndexerConfig, PathResult } from '../types';
import { BMSSPAlgorithm } from '../algorithms/BMSSP';

const DEFAULT_CONFIG: Required<GraphIndexerConfig> = {
  maxDepth: 3,
  maxResults: 10,
  enableCrossReferences: true,
  precomputeRelationships: true,
  minEdgeWeight: 0.1
};

export class GraphIndexer {
  private config: Required<GraphIndexerConfig>;
  private bmssp: BMSSPAlgorithm;

  constructor(config: GraphIndexerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.bmssp = new BMSSPAlgorithm();
  }

  /**
   * Create a graph-based index from document content
   */
  public async index(
    content: string,
    title: string,
    description?: string
  ): Promise<GraphIndex> {
    const paragraphs = this.splitIntoParagraphs(content);
    const nodes = this.createGraphNodes(paragraphs, title);
    const edges = this.identifyRelationships(nodes);
    
    if (this.config.precomputeRelationships) {
      await this.precomputeNodeRelationships(nodes, edges);
    }

    return {
      title,
      description,
      nodes,
      edges,
      metadata: {
        createdAt: new Date().toISOString(),
        version: '1.0.0',
        nodeCount: nodes.length,
        edgeCount: edges.length,
        indexType: 'graph'
      }
    };
  }

  /**
   * Find relevant paths using BMSSP algorithm
   */
  public async search(
    graph: GraphIndex,
    query: string
  ): Promise<{ paths: PathResult[], nodeList: string[] }> {
    // Find all query-relevant source nodes
    const sourceNodes = this.findQuerySources(query, graph.nodes);
    
    if (sourceNodes.length === 0) {
      return { paths: [], nodeList: [] };
    }

    // Use BMSSP for efficient multi-source search
    const paths = await this.bmssp.findBoundedPaths(
      graph,
      sourceNodes.map(node => node.nodeId),
      {
        maxDepth: this.config.maxDepth,
        maxResults: this.config.maxResults,
        minEdgeWeight: this.config.minEdgeWeight
      }
    );

    const nodeList = paths.flatMap(path => path.nodeIds);
    const uniqueNodeIds = [...new Set(nodeList)];

    return {
      paths,
      nodeList: uniqueNodeIds
    };
  }

  /**
   * Complete retrieval pipeline
   */
  public async retrieve(
    graph: GraphIndex,
    query: string
  ): Promise<{
    context: string;
    contents: any[];
    searchResult: { paths: PathResult[], nodeList: string[] };
    totalTimeMs: number;
  }> {
    const startTime = Date.now();

    // Search for relevant paths
    const searchResult = await this.search(graph, query);
    
    // Retrieve content from relevant nodes
    const contents = this.retrieveContent(graph, searchResult.nodeList);
    
    // Format context
    const context = this.formatContext(contents);

    return {
      context,
      contents,
      searchResult,
      totalTimeMs: Date.now() - startTime
    };
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private splitIntoParagraphs(content: string): string[] {
    return content
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  private createGraphNodes(paragraphs: string[], title: string): GraphNode[] {
    const nodes: GraphNode[] = [];
    
    // Create root node
    const rootNode: GraphNode = {
      nodeId: this.generateNodeId(),
      title,
      content: paragraphs.join('\n\n'),
      summary: this.generateSummary(paragraphs),
      type: 'document',
      position: { start: 0, end: paragraphs.length - 1 },
      metadata: { level: 0 }
    };
    nodes.push(rootNode);

    // Create section nodes
    let currentIndex = 0;
    for (const paragraph of paragraphs) {
      const sectionInfo = this.analyzeParagraph(paragraph);
      
      if (sectionInfo.isSection) {
        const node: GraphNode = {
          nodeId: this.generateNodeId(),
          title: sectionInfo.title,
          content: paragraph,
          summary: this.generateSummary([paragraph]),
          type: 'section',
          position: { start: currentIndex, end: currentIndex },
          metadata: { 
            level: sectionInfo.level,
            keywords: this.extractKeywords(paragraph)
          }
        };
        nodes.push(node);
      }
      currentIndex++;
    }

    return nodes;
  }

  private identifyRelationships(nodes: GraphNode[]): GraphEdge[] {
    const edges: GraphEdge[] = [];
    
    if (!this.config.enableCrossReferences) {
      return edges;
    }

    // Create parent-child relationships
    for (let i = 1; i < nodes.length; i++) {
      const child = nodes[i];
      const parent = nodes[0]; // Root node
      
      if (child.type === 'section') {
        edges.push({
          from: parent.nodeId,
          to: child.nodeId,
          weight: 0.8,
          type: 'parent-child' as const
        });
      }
    }

    // Identify cross-references
    for (let i = 1; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const weight = this.calculateSemanticSimilarity(nodes[i], nodes[j]);
        if (weight > this.config.minEdgeWeight) {
          edges.push({
            from: nodes[i].nodeId,
            to: nodes[j].nodeId,
            weight,
            type: 'semantic' as const
          });
        }
      }
    }

    return edges;
  }

  private async precomputeNodeRelationships(nodes: GraphNode[], edges: any[]): Promise<void> {
    // Pre-compute centrality measures, clusters, etc.
    // This could include PageRank, betweenness centrality, or community detection
    for (const node of nodes) {
      node.metadata = node.metadata || {};
      node.metadata.centrality = this.calculateNodeCentrality(node.nodeId, edges);
    }
  }

  private findQuerySources(query: string, nodes: GraphNode[]): GraphNode[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const relevantNodes: GraphNode[] = [];

    for (const node of nodes) {
      const nodeText = (node.title + ' ' + node.summary).toLowerCase();
      const matchCount = queryTerms.filter(term => 
        nodeText.includes(term) || (node.metadata?.keywords?.includes(term))
      ).length;
      
      if (matchCount > 0) {
        relevantNodes.push({ ...node, relevanceScore: matchCount });
      }
    }

    return relevantNodes.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  private retrieveContent(graph: GraphIndex, nodeIds: string[]): any[] {
    return nodeIds
      .map(id => graph.nodes.find(n => n.nodeId === id))
      .filter(Boolean)
      .map(node => ({
        nodeId: node!.nodeId,
        title: node!.title,
        content: node!.content,
        summary: node!.summary
      }));
  }

  private formatContext(contents: any[]): string {
    if (contents.length === 0) return '';
    return contents
      .map(c => `### ${c.title}\n${c.content}`)
      .join('\n\n');
  }

  private analyzeParagraph(paragraph: string): { isSection: boolean; title: string; level: number } {
    // Markdown heading detection
    const markdownMatch = paragraph.match(/^(#{1,6})\s+(.*)/);
    if (markdownMatch) {
      return {
        isSection: true,
        title: markdownMatch[2],
        level: Math.min(markdownMatch[1].length, 4)
      };
    }

    // Numbered section detection
    const numberedMatch = paragraph.match(/^(\d+(\.\d+)*)\s+(.*)/);
    if (numberedMatch) {
      return {
        isSection: true,
        title: numberedMatch[3],
        level: Math.min(numberedMatch[1].split('.').length, 4)
      };
    }

    // Common section titles
    const commonSections = /^(introduction|abstract|conclusion|references|appendix|summary|overview|background)/i;
    if (commonSections.test(paragraph) && paragraph.length < 50) {
      return { isSection: true, title: paragraph, level: 1 };
    }

    return { isSection: false, title: '', level: 0 };
  }

  private generateSummary(content: string[]): string {
    const text = content.join(' ');
    const maxLen = 200;
    return text.length <= maxLen ? text : text.substring(0, maxLen - 3) + '...';
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 10);
  }

  private calculateSemanticSimilarity(node1: GraphNode, node2: GraphNode): number {
    const keywords1 = node1.metadata?.keywords || [];
    const keywords2 = node2.metadata?.keywords || [];
    
    if (keywords1.length === 0 || keywords2.length === 0) return 0;
    
    const intersection = keywords1.filter(k => keywords2.includes(k));
    const union = [...new Set([...keywords1, ...keywords2])];
    
    return intersection.length / union.length;
  }

  private calculateNodeCentrality(nodeId: string, edges: any[]): number {
    const connections = edges.filter(e => e.from === nodeId || e.to === nodeId);
    return Math.min(connections.length / 10, 1); // Normalize to 0-1
  }

  private generateNodeId(): string {
    return 'node_' + Math.random().toString(36).substring(2, 10);
  }
}