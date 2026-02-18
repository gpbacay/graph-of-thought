/**
 * Optimized BMSSP (Bounded Multi-Source Shortest Path) Algorithm
 * Enhanced version with selective node activation for maximum efficiency
 * Creates tree-like activation patterns within graph structure
 * Only activates nodes that are truly relevant to the query
 */

import { GraphIndex, GraphNode, GraphEdge, PathResult, BMSSPOptions } from '../types';

interface OptimizedQueueItem {
  nodeId: string;
  distance: number;
  path: string[];
  visited: Set<string>;
  activationScore: number; // Score for selective activation
  parentScore: number;     // Parent node's activation score
}

export class OptimizedBMSSPAlgorithm {
  /**
   * Find bounded paths with selective node activation
   * Only activates nodes that are truly relevant to the query
   * Creates tree-like activation patterns within the graph structure
   */
  async findBoundedPaths(
    graph: GraphIndex,
    sourceNodeIds: string[],
    options: BMSSPOptions
  ): Promise<{ paths: PathResult[], activatedNodeCount: number }> {
    const {
      maxDepth = 3,
      maxResults = 10,
      minEdgeWeight = 0.1
    } = options;

    const results: PathResult[] = [];
    const queue: OptimizedQueueItem[] = [];
    const visitedPaths = new Set<string>();
    const activatedNodes = new Set<string>(); // Track actually activated nodes
    const totalNodes = graph.nodes.length;
    
    // Initialize queue with source nodes and their activation scores
    for (const sourceId of sourceNodeIds) {
      const sourceNode = graph.nodes.find((n: GraphNode) => n.nodeId === sourceId);
      if (sourceNode) {
        const activationScore = this.calculateNodeActivationScore(sourceNode, sourceNodeIds, graph);
        queue.push({
          nodeId: sourceId,
          distance: 0,
          path: [sourceId],
          visited: new Set([sourceId]),
          activationScore,
          parentScore: 1.0 // Root nodes get maximum score
        });
        activatedNodes.add(sourceId);
      }
    }

    // Process queue using selective activation approach
    while (queue.length > 0 && results.length < maxResults) {
      // Sort by activation score (priority) then distance
      queue.sort((a, b) => {
        if (b.activationScore !== a.activationScore) {
          return b.activationScore - a.activationScore; // Higher score first
        }
        return a.distance - b.distance; // Then by distance
      });
      
      const current = queue.shift()!;
      
      // Skip if we've exceeded max depth or if node isn't worth activating
      if (current.distance > maxDepth || current.activationScore < 0.25) continue;
      
      // Create path signature to avoid duplicates
      const pathSignature = current.path.join('->');
      if (visitedPaths.has(pathSignature)) continue;
      visitedPaths.add(pathSignature);

      // Add result if we have a meaningful path
      if (current.path.length > 1) {
        const pathResult: PathResult = {
          nodeIds: [...current.path],
          distance: current.distance,
          pathScore: this.calculatePathScore(current.path, graph),
          reasoning: this.generatePathReasoning(current.path, graph)
        };
        results.push(pathResult);
      }

      // Selectively explore neighbors - only activate high-value connections
      const neighbors = this.getValidNeighborsWithSelectiveActivation(
        current.nodeId, 
        graph, 
        current.visited,
        minEdgeWeight,
        current.activationScore
      );

      for (const neighbor of neighbors) {
        if (!current.visited.has(neighbor.nodeId)) {
          const newVisited = new Set(current.visited);
          newVisited.add(neighbor.nodeId);
          
          // Calculate activation score for the neighbor
          const neighborNode = graph.nodes.find((n: GraphNode) => n.nodeId === neighbor.nodeId);
          const baseScore = neighborNode ? 
            this.calculateNodeActivationScore(neighborNode, sourceNodeIds, graph) : 0.5;
          
          // Adjust score based on edge weight and parent score
          const activationScore = baseScore * neighbor.weight * current.activationScore;
          
          // Only activate nodes with sufficient relevance (tree-like pruning)
          if (activationScore >= 0.15) {
            queue.push({
              nodeId: neighbor.nodeId,
              distance: current.distance + neighbor.weight,
              path: [...current.path, neighbor.nodeId],
              visited: newVisited,
              activationScore,
              parentScore: current.activationScore
            });
            activatedNodes.add(neighbor.nodeId);
          }
        }
      }
    }

    const activationRate = ((activatedNodes.size / totalNodes) * 100).toFixed(1);
    console.log(`🔍 Selective Activation: ${activatedNodes.size}/${totalNodes} nodes activated (${activationRate}%)`);

    // Sort results by path score (descending)
    const sortedResults = results
      .sort((a, b) => b.pathScore - a.pathScore)
      .slice(0, maxResults);

    return {
      paths: sortedResults,
      activatedNodeCount: activatedNodes.size
    };
  }

  /**
   * Calculate node activation score based on multiple relevance factors
   * Higher scores mean the node is more worth activating
   */
  private calculateNodeActivationScore(
    node: GraphNode, 
    sourceNodeIds: string[], 
    graph: GraphIndex
  ): number {
    // Factor 1: Node centrality (importance in the graph)
    const centrality = node.metadata?.centrality || 0.5;
    
    // Factor 2: Semantic similarity to source nodes
    const sourceNodes = graph.nodes.filter(n => sourceNodeIds.includes(n.nodeId));
    let semanticSimilarity = 0;
    if (sourceNodes.length > 0) {
      semanticSimilarity = Math.max(...sourceNodes.map(source => 
        this.calculateSemanticSimilarity(node, source)
      ));
    }
    
    // Factor 3: Query keyword relevance
    const keywordRelevance = node.metadata?.keywords?.length ? 0.4 : 0;
    
    // Factor 4: Node type importance (sections more important than content)
    const typeWeight = node.type === 'section' ? 0.8 : 0.3;
    
    // Factor 5: Position in document (earlier sections often more important)
    const positionWeight = Math.max(0.7, 1.0 - (node.position?.start || 0) * 0.1);
    
    // Combine all factors with weighted importance
    const combinedScore = 
      (centrality * 0.25) + 
      (semanticSimilarity * 0.3) + 
      (keywordRelevance * 0.15) + 
      (typeWeight * 0.15) + 
      (positionWeight * 0.15);
    
    return Math.min(combinedScore, 1.0);
  }

  /**
   * Get valid neighbors with selective activation filtering
   * Implements tree-like pruning based on activation thresholds
   */
  private getValidNeighborsWithSelectiveActivation(
    nodeId: string,
    graph: GraphIndex,
    visited: Set<string>,
    minWeight: number,
    parentActivationScore: number
  ): Array<{ nodeId: string; weight: number }> {
    const neighbors: Array<{ nodeId: string; weight: number }> = [];
    
    // Dynamic threshold based on parent's activation score
    // Higher parent score = more selective child activation
    const dynamicThreshold = Math.max(minWeight, 0.7 - (parentActivationScore * 0.4));
    
    // Find outgoing edges with selective filtering
    for (const edge of graph.edges) {
      if (edge.from === nodeId && !visited.has(edge.to)) {
        // Apply dynamic threshold for selective activation
        if (edge.weight >= dynamicThreshold) {
          neighbors.push({
            nodeId: edge.to,
            weight: edge.weight
          });
        }
      }
    }
    
    // Check reverse edges for undirected relationships
    for (const edge of graph.edges) {
      if (edge.to === nodeId && !visited.has(edge.from)) {
        if (edge.weight >= dynamicThreshold) {
          neighbors.push({
            nodeId: edge.from,
            weight: edge.weight
          });
        }
      }
    }
    
    // Sort neighbors by edge weight (stronger connections first)
    return neighbors.sort((a, b) => b.weight - a.weight);
  }

  /**
   * Calculate semantic similarity between two nodes
   */
  private calculateSemanticSimilarity(node1: GraphNode, node2: GraphNode): number {
    const keywords1 = node1.metadata?.keywords || [];
    const keywords2 = node2.metadata?.keywords || [];
    
    if (keywords1.length === 0 || keywords2.length === 0) return 0;
    
    const intersection = keywords1.filter(k => keywords2.includes(k));
    const union = [...new Set([...keywords1, ...keywords2])];
    
    return intersection.length / Math.max(union.length, 1);
  }

  /**
   * Calculate overall path score based on node relevance and edge weights
   */
  private calculatePathScore(path: string[], graph: GraphIndex): number {
    if (path.length < 2) return 0;

    let totalScore = 0;
    let edgeWeightSum = 0;

    // Sum edge weights along the path
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      
      const edge = graph.edges.find((e: GraphEdge) => 
        (e.from === from && e.to === to) || (e.from === to && e.to === from)
      );
      
      if (edge) {
        edgeWeightSum += edge.weight;
      }
    }

    // Calculate node relevance (based on centrality and content)
    const nodeScores = path.map(nodeId => {
      const node = graph.nodes.find((n: GraphNode) => n.nodeId === nodeId);
      return node ? (node.metadata?.centrality || 0.5) : 0;
    });

    const avgNodeScore = nodeScores.reduce((a, b) => a + b, 0) / Math.max(nodeScores.length, 1);
    
    // Combine edge weights and node scores
    totalScore = (edgeWeightSum / Math.max(path.length - 1, 1)) * 0.7 + avgNodeScore * 0.3;
    
    return Math.min(totalScore, 1); // Normalize to 0-1
  }

  /**
   * Generate human-readable reasoning for why this path is relevant
   */
  private generatePathReasoning(path: string[], graph: GraphIndex): string {
    if (path.length === 0) return 'No path found';

    const nodeTitles = path.map(nodeId => {
      const node = graph.nodes.find((n: GraphNode) => n.nodeId === nodeId);
      return node ? node.title : 'Unknown';
    });

    if (path.length === 1) {
      return `Found relevant section: "${nodeTitles[0]}"`;
    }

    if (path.length === 2) {
      return `Connected related sections: "${nodeTitles[0]}" and "${nodeTitles[1]}"`;
    }

    return `Found connected path through sections: ${nodeTitles.join(' → ')}`;
  }
}