/**
 * BMSSP (Bounded Multi-Source Shortest Path) Algorithm
 * Efficient algorithm for finding shortest paths from multiple sources
 * with bounded search depth for graph-based document indexing
 */

import { GraphIndex, GraphNode, GraphEdge, PathResult, BMSSPOptions } from '../types';

interface QueueItem {
  nodeId: string;
  distance: number;
  path: string[];
  visited: Set<string>;
}

export class BMSSPAlgorithm {
  /**
   * Find bounded shortest paths from multiple source nodes
   */
  async findBoundedPaths(
    graph: GraphIndex,
    sourceNodeIds: string[],
    options: BMSSPOptions
  ): Promise<PathResult[]> {
    const {
      maxDepth = 3,
      maxResults = 10,
      minEdgeWeight = 0.1
    } = options;

    const results: PathResult[] = [];
    const queue: QueueItem[] = [];
    const visitedPaths = new Set<string>();

    // Initialize queue with all source nodes
    for (const sourceId of sourceNodeIds) {
      const sourceNode = graph.nodes.find((n: GraphNode) => n.nodeId === sourceId);
      if (sourceNode) {
        queue.push({
          nodeId: sourceId,
          distance: 0,
          path: [sourceId],
          visited: new Set([sourceId])
        });
      }
    }

    // Process queue using bounded BFS-like approach
    while (queue.length > 0 && results.length < maxResults) {
      // Sort by distance for priority processing
      queue.sort((a, b) => a.distance - b.distance);
      const current = queue.shift()!;

      // Skip if we've exceeded max depth
      if (current.distance > maxDepth) continue;

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

      // Explore neighbors
      const neighbors = this.getValidNeighbors(
        current.nodeId, 
        graph, 
        current.visited,
        minEdgeWeight
      );

      for (const neighbor of neighbors) {
        if (!current.visited.has(neighbor.nodeId)) {
          const newVisited = new Set(current.visited);
          newVisited.add(neighbor.nodeId);
          
          queue.push({
            nodeId: neighbor.nodeId,
            distance: current.distance + neighbor.weight,
            path: [...current.path, neighbor.nodeId],
            visited: newVisited
          });
        }
      }
    }

    // Sort results by path score (descending)
    return results
      .sort((a, b) => b.pathScore - a.pathScore)
      .slice(0, maxResults);
  }

  /**
   * Get valid neighboring nodes with edge weights
   */
  private getValidNeighbors(
    nodeId: string,
    graph: GraphIndex,
    visited: Set<string>,
    minWeight: number
  ): Array<{ nodeId: string; weight: number }> {
    const neighbors: Array<{ nodeId: string; weight: number }> = [];

    // Find outgoing edges
    for (const edge of graph.edges) {
      if (edge.from === nodeId && !visited.has(edge.to) && edge.weight >= minWeight) {
        neighbors.push({
          nodeId: edge.to,
          weight: edge.weight
        });
      }
    }

    // Also check reverse edges for undirected relationships
    for (const edge of graph.edges) {
      if (edge.to === nodeId && !visited.has(edge.from) && edge.weight >= minWeight) {
        neighbors.push({
          nodeId: edge.from,
          weight: edge.weight
        });
      }
    }

    return neighbors;
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

    const avgNodeScore = nodeScores.reduce((a, b) => a + b, 0) / nodeScores.length;
    
    // Combine edge weights and node scores
    totalScore = (edgeWeightSum / (path.length - 1)) * 0.7 + avgNodeScore * 0.3;
    
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