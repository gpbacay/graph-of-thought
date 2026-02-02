/**
 * DocumentParser - Parse various document formats into tree structures
 *
 * Supports Markdown, HTML, and plain text out of the box.
 * PDF support requires optional @cyber2024/pdf-parse-fixed package.
 */

import * as fs from 'fs';
import * as path from 'path';
import { TreeGenerator } from './TreeGenerator';
import { TreeIndex, ParseOptions, DocumentFormat } from '../types';

/**
 * DocumentParser handles parsing of different document formats
 *
 * @example
 * ```typescript
 * const parser = new DocumentParser();
 *
 * // Parse markdown (no extra dependencies)
 * const tree = await parser.parseMarkdown(content, 'My Doc');
 *
 * // Parse a file
 * const tree2 = await parser.parseFile('./readme.md');
 * ```
 */
export class DocumentParser {
  private generator: TreeGenerator;

  constructor(generator?: TreeGenerator) {
    this.generator = generator || new TreeGenerator();
  }

  /**
   * Parse a file and generate a tree index
   */
  async parseFile(filePath: string, options: ParseOptions = {}): Promise<TreeIndex> {
    const ext = path.extname(filePath).toLowerCase();
    const title = options.title || path.basename(filePath, ext);
    const format = options.format || this.detectFormat(ext);

    switch (format) {
      case 'pdf':
        return this.parsePdfFile(filePath, title, options.description);
      case 'markdown':
        return this.parseMarkdownFile(filePath, title, options.description);
      case 'html':
        return this.parseHtmlFile(filePath, title, options.description);
      default:
        return this.parseTextFile(filePath, title, options.description);
    }
  }

  /**
   * Parse a PDF file (requires optional pdf-parse package)
   */
  async parsePdfFile(
    filePath: string,
    title?: string,
    description?: string
  ): Promise<TreeIndex> {
    const docTitle = title || path.basename(filePath, '.pdf');

    try {
      const pdfParse = await import('@cyber2024/pdf-parse-fixed');
      const buffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse.default(buffer);

      const cleanContent = this.cleanPdfText(pdfData.text);
      const tree = await this.generator.generateTree(cleanContent, docTitle, description);

      return { ...tree, source: { type: 'pdf', path: filePath } };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'PDF parsing requires @cyber2024/pdf-parse-fixed. ' +
          'Install it with: npm install @cyber2024/pdf-parse-fixed'
        );
      }
      throw new Error(`Failed to parse PDF: ${(error as Error).message}`);
    }
  }

  /**
   * Parse a PDF buffer directly (requires optional pdf-parse package)
   */
  async parsePdfBuffer(
    buffer: Buffer,
    title: string,
    description?: string
  ): Promise<TreeIndex> {
    try {
      const pdfParse = await import('@cyber2024/pdf-parse-fixed');
      const pdfData = await pdfParse.default(buffer);

      const cleanContent = this.cleanPdfText(pdfData.text);
      const tree = await this.generator.generateTree(cleanContent, title, description);

      return { ...tree, source: { type: 'pdf' } };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'PDF parsing requires @cyber2024/pdf-parse-fixed. ' +
          'Install it with: npm install @cyber2024/pdf-parse-fixed'
        );
      }
      throw new Error(`Failed to parse PDF buffer: ${(error as Error).message}`);
    }
  }

  /**
   * Parse a Markdown file
   */
  async parseMarkdownFile(
    filePath: string,
    title?: string,
    description?: string
  ): Promise<TreeIndex> {
    const docTitle = title || path.basename(filePath, path.extname(filePath));
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parseMarkdown(content, docTitle, description);
  }

  /**
   * Parse Markdown content directly
   */
  async parseMarkdown(
    content: string,
    title: string,
    description?: string
  ): Promise<TreeIndex> {
    const plainText = this.convertMarkdownToPlainText(content);
    const tree = await this.generator.generateTree(plainText, title, description);
    return { ...tree, source: { type: 'markdown' } };
  }

  /**
   * Parse an HTML file
   */
  async parseHtmlFile(
    filePath: string,
    title?: string,
    description?: string
  ): Promise<TreeIndex> {
    const docTitle = title || path.basename(filePath, path.extname(filePath));
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parseHtml(content, docTitle, description);
  }

  /**
   * Parse HTML content directly
   */
  async parseHtml(
    content: string,
    title: string,
    description?: string
  ): Promise<TreeIndex> {
    const plainText = this.stripHtml(content);
    const tree = await this.generator.generateTree(plainText, title, description);
    return { ...tree, source: { type: 'html' } };
  }

  /**
   * Parse a plain text file
   */
  async parseTextFile(
    filePath: string,
    title?: string,
    description?: string
  ): Promise<TreeIndex> {
    const docTitle = title || path.basename(filePath, path.extname(filePath));
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parseText(content, docTitle, description);
  }

  /**
   * Parse plain text content
   */
  async parseText(
    content: string,
    title: string,
    description?: string
  ): Promise<TreeIndex> {
    const tree = await this.generator.generateTree(content, title, description);
    return { ...tree, source: { type: 'text' } };
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private detectFormat(ext: string): DocumentFormat {
    const formatMap: Record<string, DocumentFormat> = {
      '.pdf': 'pdf',
      '.md': 'markdown',
      '.markdown': 'markdown',
      '.html': 'html',
      '.htm': 'html',
      '.txt': 'text',
    };
    return formatMap[ext] || 'text';
  }

  private cleanPdfText(text: string): string {
    let cleaned = text
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return this.preserveDocumentStructure(cleaned);
  }

  private preserveDocumentStructure(text: string): string {
    const lines = text.split('\n');
    const processedLines: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (this.isPotentialHeading(trimmedLine)) {
        processedLines.push(`# ${trimmedLine}`);
      } else {
        processedLines.push(trimmedLine);
      }
    }

    return processedLines.join('\n');
  }

  private isPotentialHeading(line: string): boolean {
    if (!line || line.length > 100) return false;

    const isShort = line.length <= 50;
    const endsWithColon = line.endsWith(':');
    const isNumbered = /^\d+(\.\d+)*\s+\w/.test(line);
    const isAllCaps = line === line.toUpperCase() && line.length > 3 && /[A-Z]/.test(line);

    return (isShort && (endsWithColon || isNumbered || isAllCaps)) || isNumbered;
  }

  private convertMarkdownToPlainText(markdown: string): string {
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/!\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/^\s*[-*_]{3,}\s*$/gm, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/^\s*[*+-]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/```[\s\S]*?```/g, (match) => {
        return match
          .replace(/```.*?\n/, '')
          .replace(/```$/, '')
          .split('\n')
          .map((line) => `    ${line}`)
          .join('\n');
      })
      .replace(/`(.*?)`/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
      .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
      .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
      .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n')
      .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n')
      .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
