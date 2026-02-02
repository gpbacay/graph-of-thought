/**
 * Simple in-memory cache for tree indexes
 */

import { TreeIndex } from '../types';

interface CacheEntry {
  tree: TreeIndex;
  timestamp: number;
  ttl: number;
}

/**
 * TreeCache - Simple TTL-based cache for tree indexes
 */
export class TreeCache {
  private cache: Map<string, CacheEntry>;
  private defaultTtl: number;

  constructor(defaultTtlMs: number = 3600000) {
    // Default 1 hour
    this.cache = new Map();
    this.defaultTtl = defaultTtlMs;
  }

  /**
   * Store a tree in the cache
   */
  set(key: string, tree: TreeIndex, ttlMs?: number): void {
    this.cache.set(key, {
      tree,
      timestamp: Date.now(),
      ttl: ttlMs ?? this.defaultTtl,
    });
  }

  /**
   * Get a tree from the cache
   */
  get(key: string): TreeIndex | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.tree;
  }

  /**
   * Check if a key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a cached tree
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached trees
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    // Clean expired entries first
    this.cleanup();

    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Create a file-based cache key from a file path
 */
export function createFileKey(filePath: string, stats?: { mtimeMs: number }): string {
  const base = filePath.replace(/[^a-zA-Z0-9]/g, '_');
  if (stats) {
    return `${base}_${stats.mtimeMs}`;
  }
  return base;
}
