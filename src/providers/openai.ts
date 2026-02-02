/**
 * OpenAI Provider for Tree-of-Thought
 * 
 * Supports GPT-4, GPT-4 Turbo, GPT-3.5 Turbo, and other OpenAI models
 */

import { LLMProvider, LLMGenerateOptions, LLMResponse, LLMMessage } from '../types';

export interface OpenAIProviderConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
  organization?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
}

export class OpenAIProvider implements LLMProvider {
  public readonly name = 'openai';
  private client: any;
  private model: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: OpenAIProviderConfig) {
    this.model = config.model || 'gpt-4-turbo-preview';
    this.defaultTemperature = config.defaultTemperature ?? 0.1;
    this.defaultMaxTokens = config.defaultMaxTokens ?? 1000;

    // Lazy load OpenAI SDK
    this.initClient(config);
  }

  private async initClient(config: OpenAIProviderConfig): Promise<void> {
    try {
      const { OpenAI } = await import('openai');
      this.client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        organization: config.organization,
      });
    } catch (error) {
      throw new Error(
        'OpenAI SDK not installed. Run: npm install openai'
      );
    }
  }

  private async ensureClient(): Promise<void> {
    if (!this.client) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!this.client) {
        throw new Error('OpenAI client not initialized');
      }
    }
  }

  async generate(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse> {
    await this.ensureClient();

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? this.defaultTemperature,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      stop: options?.stopSequences,
    });

    return {
      text: response.choices[0]?.message?.content || '',
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
      model: response.model,
    };
  }

  async chat(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<LLMResponse> {
    await this.ensureClient();

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options?.temperature ?? this.defaultTemperature,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      stop: options?.stopSequences,
    });

    return {
      text: response.choices[0]?.message?.content || '',
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
      model: response.model,
    };
  }
}

/**
 * Create an OpenAI provider with environment variable API key
 */
export function createOpenAIProvider(
  model?: string,
  options?: Partial<OpenAIProviderConfig>
): OpenAIProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable not set');
  }

  return new OpenAIProvider({
    apiKey,
    model,
    ...options,
  });
}
