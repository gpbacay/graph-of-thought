/**
 * Google AI (Gemini) Provider for Tree-of-Thought
 * 
 * Supports Gemini Pro, Gemini Pro Vision, and other Google AI models
 */

import { LLMProvider, LLMGenerateOptions, LLMResponse, LLMMessage } from '../types';

export interface GoogleProviderConfig {
  apiKey: string;
  model?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
}

export class GoogleProvider implements LLMProvider {
  public readonly name = 'google';
  private client: any;
  private modelInstance: any;
  private model: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private apiKey: string;

  constructor(config: GoogleProviderConfig) {
    this.model = config.model || 'gemini-pro';
    this.defaultTemperature = config.defaultTemperature ?? 0.1;
    this.defaultMaxTokens = config.defaultMaxTokens ?? 1000;
    this.apiKey = config.apiKey;

    this.initClient(config);
  }

  private async initClient(config: GoogleProviderConfig): Promise<void> {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      this.client = new GoogleGenerativeAI(config.apiKey);
      this.modelInstance = this.client.getGenerativeModel({ model: this.model });
    } catch (error) {
      throw new Error(
        'Google Generative AI SDK not installed. Run: npm install @google/generative-ai'
      );
    }
  }

  private async ensureClient(): Promise<void> {
    if (!this.modelInstance) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!this.modelInstance) {
        throw new Error('Google AI client not initialized');
      }
    }
  }

  async generate(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse> {
    await this.ensureClient();

    const generationConfig = {
      temperature: options?.temperature ?? this.defaultTemperature,
      maxOutputTokens: options?.maxTokens ?? this.defaultMaxTokens,
      stopSequences: options?.stopSequences,
    };

    const result = await this.modelInstance.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });

    const response = result.response;
    const text = response.text();

    return {
      text,
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          }
        : undefined,
      model: this.model,
    };
  }

  async chat(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<LLMResponse> {
    await this.ensureClient();

    const generationConfig = {
      temperature: options?.temperature ?? this.defaultTemperature,
      maxOutputTokens: options?.maxTokens ?? this.defaultMaxTokens,
      stopSequences: options?.stopSequences,
    };

    // Convert messages to Gemini format
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    // Prepend system message to first user message if present
    const systemMessage = messages.find((m) => m.role === 'system');
    if (systemMessage && contents.length > 0 && contents[0].role === 'user') {
      contents[0].parts[0].text = `${systemMessage.content}\n\n${contents[0].parts[0].text}`;
    }

    const result = await this.modelInstance.generateContent({
      contents,
      generationConfig,
    });

    const response = result.response;
    const text = response.text();

    return {
      text,
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          }
        : undefined,
      model: this.model,
    };
  }
}

/**
 * Create a Google AI provider with environment variable API key
 */
export function createGoogleProvider(
  model?: string,
  options?: Partial<GoogleProviderConfig>
): GoogleProvider {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY environment variable not set');
  }

  return new GoogleProvider({
    apiKey,
    model,
    ...options,
  });
}
