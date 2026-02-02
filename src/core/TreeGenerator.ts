/**
 * TreeGenerator - Core module for creating hierarchical tree structures
 * Transforms documents into a "Table of Contents" style tree structure
 */

import { TreeNode, DocumentNode, TreeIndex, TreeGeneratorConfig } from '../types';

const DEFAULT_CONFIG: Required<TreeGeneratorConfig> = {
  maxPagesPerNode: 10,
  maxTokensPerNode: 20000,
  addNodeSummary: true,
  maxSummaryLength: 200,
  headingPatterns: [],
};

export class TreeGenerator {
  private config: Required<TreeGeneratorConfig>;

  constructor(config: TreeGeneratorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public async generateTree(
    content: string,
    title: string,
    description?: string
  ): Promise<TreeIndex> {
    const paragraphs = this.splitIntoParagraphs(content);
    const sections = this.identifySections(paragraphs);
    const nodes = this.buildNodes(sections, title);

    return {
      title,
      description,
      nodes,
      createdAt: new Date().toISOString(),
      version: '1.0.0',
      source: { type: 'text' },
    };
  }

  public static countNodes(nodes: TreeNode[]): number {
    let count = 0;
    const traverse = (nodeList: TreeNode[]) => {
      for (const node of nodeList) {
        count++;
        if (node.children.length > 0) traverse(node.children);
      }
    };
    traverse(nodes);
    return count;
  }

  public static getMaxDepth(nodes: TreeNode[]): number {
    let maxDepth = 0;
    const traverse = (nodeList: TreeNode[], depth: number) => {
      if (depth > maxDepth) maxDepth = depth;
      for (const node of nodeList) {
        if (node.children.length > 0) traverse(node.children, depth + 1);
      }
    };
    traverse(nodes, 1);
    return maxDepth;
  }

  public static flattenTree(nodes: TreeNode[]): TreeNode[] {
    const result: TreeNode[] = [];
    const traverse = (nodeList: TreeNode[]) => {
      for (const node of nodeList) {
        result.push(node);
        if (node.children.length > 0) traverse(node.children);
      }
    };
    traverse(nodes);
    return result;
  }

  private splitIntoParagraphs(content: string): string[] {
    return content.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);
  }

  private identifySections(paragraphs: string[]): DocumentNode[] {
    const sections: DocumentNode[] = [];
    let currentSection: DocumentNode | null = null;
    let currentIndex = 0;

    for (const paragraph of paragraphs) {
      const sectionInfo = this.analyzeParagraphForSection(paragraph);

      if (sectionInfo.isHeading) {
        if (currentSection) {
          currentSection.endIndex = currentIndex - 1;
          currentSection.text = currentSection.content.join('\n\n');
          sections.push(currentSection);
        }

        currentSection = {
          title: sectionInfo.title,
          nodeId: this.generateNodeId(),
          startIndex: currentIndex,
          endIndex: currentIndex,
          summary: this.generateSummary([paragraph]),
          content: [paragraph],
          text: paragraph,
          level: sectionInfo.level,
          children: [],
        };
      } else {
        if (currentSection) {
          currentSection.content.push(paragraph);
          currentIndex++;
        } else {
          const orphanSection: DocumentNode = {
            title: `Section ${sections.length + 1}`,
            nodeId: this.generateNodeId(),
            startIndex: currentIndex,
            endIndex: currentIndex,
            summary: this.generateSummary([paragraph]),
            content: [paragraph],
            text: paragraph,
            level: 1,
            children: [],
          };
          sections.push(orphanSection);
          currentIndex++;
        }
      }
    }

    if (currentSection) {
      currentSection.endIndex = currentIndex - 1;
      currentSection.text = currentSection.content.join('\n\n');
      sections.push(currentSection);
    }

    return sections;
  }

  private analyzeParagraphForSection(paragraph: string): {
    isHeading: boolean;
    title: string;
    level: number;
  } {
    for (const pattern of this.config.headingPatterns) {
      const match = paragraph.match(pattern);
      if (match) return { isHeading: true, title: match[1] || paragraph, level: 1 };
    }

    const numberedMatch = paragraph.match(/^(\d+(\.\d+)*)\s+(.*)/);
    if (numberedMatch) {
      return {
        isHeading: true,
        title: numberedMatch[3],
        level: Math.min(numberedMatch[1].split('.').length, 4),
      };
    }

    const markdownMatch = paragraph.match(/^(#{1,6})\s+(.*)/);
    if (markdownMatch) {
      return {
        isHeading: true,
        title: markdownMatch[2],
        level: Math.min(markdownMatch[1].length, 4),
      };
    }

    const commonSections = /^(introduction|abstract|conclusion|references|appendix|summary|overview|background)/i;
    if (commonSections.test(paragraph) && paragraph.length < 50) {
      return { isHeading: true, title: paragraph, level: 1 };
    }

    if (
      paragraph.length < 100 &&
      paragraph.split(/\s+/).length <= 10 &&
      (paragraph.endsWith(':') || /^[A-Z][^.!?]*$/.test(paragraph) || paragraph === paragraph.toUpperCase())
    ) {
      return { isHeading: true, title: paragraph.replace(/[:]+$/, ''), level: 1 };
    }

    return { isHeading: false, title: '', level: 0 };
  }

  private buildNodes(sections: DocumentNode[], title: string): TreeNode[] {
    if (sections.length === 0) return [];

    const allText = sections.flatMap((s) => s.content).join('\n\n');
    const rootNode: TreeNode = {
      title,
      nodeId: this.generateNodeId(),
      startIndex: 0,
      endIndex: sections.length - 1,
      summary: this.generateSummary(sections.flatMap((s) => s.content)),
      text: allText,
      children: [],
    };

    rootNode.children = this.buildHierarchy(sections, 0);
    return [rootNode];
  }

  private buildHierarchy(sections: DocumentNode[], minLevel: number): TreeNode[] {
    if (sections.length === 0) return [];

    const result: TreeNode[] = [];
    let i = 0;

    while (i < sections.length) {
      const currentSection = sections[i];

      const node: TreeNode = {
        title: currentSection.title,
        nodeId: currentSection.nodeId,
        startIndex: currentSection.startIndex,
        endIndex: currentSection.endIndex,
        summary: currentSection.summary,
        text: currentSection.text || currentSection.content.join('\n\n'),
        children: [],
      };

      const childrenStartIndex = i + 1;
      let childrenEndIndex = childrenStartIndex;

      while (
        childrenEndIndex < sections.length &&
        sections[childrenEndIndex].level > (currentSection.level || minLevel)
      ) {
        childrenEndIndex++;
      }

      const childrenSections = sections.slice(childrenStartIndex, childrenEndIndex);
      node.children = this.buildHierarchy(childrenSections, minLevel + 1);

      result.push(node);
      i = childrenEndIndex > childrenStartIndex ? childrenEndIndex : i + 1;
    }

    return result;
  }

  private generateSummary(content: string[]): string {
    const text = content.join(' ');
    const maxLen = this.config.maxSummaryLength;
    return text.length <= maxLen ? text : text.substring(0, maxLen - 3) + '...';
  }

  private generateNodeId(): string {
    return Math.random().toString(36).substring(2, 10);
  }
}
