/**
 * Anthropic (Claude) Provider for Tree-of-Thought
 * 
 * Supports Claude 3 Opus, Sonnet, Haiku and other Anthropic models
 */

import { LLMProvider, LLMGenerateOptions, LLMResponse, LLMMessage } from '../types';

export interface AnthropicProviderConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
}

export class AnthropicProvider implements LLMProvider {
  public readonly name = 'anthropic';
  private client: any;
  private model: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: AnthropicProviderConfig) {
    this.model = config.model || 'claude-3-sonnet-20240229';
    this.defaultTemperature = config.defaultTemperature ?? 0.1;
    this.defaultMaxTokens = config.defaultMaxTokens ?? 1000;

    this.initClient(config);
  }

  private async initClient(config: AnthropicProviderConfig): Promise<void> {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      this.client = new Anthropic({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
    } catch (error) {
      throw new Error(
        'Anthropic SDK not installed. Run: npm install @anthropic-ai/sdk'
      );
    }
  }

  private async ensureClient(): Promise<void> {
    if (!this.client) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!this.client) {
        throw new Error('Anthropic client not initialized');
      }
    }
  }

  async generate(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse> {
    await this.ensureClient();

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? this.defaultTemperature,
      stop_sequences: options?.stopSequences,
    });

    const text = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');

    return {
      text,
      usage: response.usage
        ? {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          }
        : undefined,
      model: response.model,
    };
  }

  async chat(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<LLMResponse> {
    await this.ensureClient();

    // Extract system message if present
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      system: systemMessage?.content,
      messages: chatMessages,
      temperature: options?.temperature ?? this.defaultTemperature,
      stop_sequences: options?.stopSequences,
    });

    const text = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');

    return {
      text,
      usage: response.usage
        ? {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          }
        : undefined,
      model: response.model,
    };
  }
}

/**
 * Create an Anthropic provider with environment variable API key
 */
export function createAnthropicProvider(
  model?: string,
  options?: Partial<AnthropicProviderConfig>
): AnthropicProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable not set');
  }

  return new AnthropicProvider({
    apiKey,
    model,
    ...options,
  });
}
