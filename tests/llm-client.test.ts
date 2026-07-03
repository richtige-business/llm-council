// ============================================
// llm-client.test.ts - Tests für den LLM Client
//
// Zweck: Prüft Factory-Erstellung und Provider-Auswahl
// Verwendet von: npm run test
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock des @next/env Moduls (wird in client.ts verwendet)
vi.mock('@next/env', () => ({
  loadEnvConfig: vi.fn(),
}));

// Mock der Provider als Klassen
vi.mock('@/lib/llm/providers/anthropic', () => {
  return {
    AnthropicProvider: class MockAnthropicProvider {
      provider = 'anthropic';
      apiKey: string;
      constructor(apiKey: string) { this.apiKey = apiKey; }
      generate = vi.fn();
      getAvailableModels() {
        return [{ id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' }];
      }
    },
  };
});

vi.mock('@/lib/llm/providers/openai', () => {
  return {
    OpenAIProvider: class MockOpenAIProvider {
      provider = 'openai';
      apiKey: string;
      constructor(apiKey: string) { this.apiKey = apiKey; }
      generate = vi.fn();
      getAvailableModels() {
        return [{ id: 'gpt-4o', name: 'GPT-4o' }];
      }
    },
  };
});

import { createLLMClient, getDefaultProvider } from '@/lib/llm/client';

describe('LLM Client Factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Standard: Beide Keys gesetzt
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.LLM_PROVIDER = '';
  });

  // --------------------------------------------
  // createLLMClient()
  // --------------------------------------------

  describe('createLLMClient()', () => {
    it('erstellt Anthropic Client', () => {
      const client = createLLMClient('anthropic');
      expect(client).toBeDefined();
      expect(client.provider).toBe('anthropic');
    });

    it('erstellt OpenAI Client', () => {
      const client = createLLMClient('openai');
      expect(client).toBeDefined();
      expect(client.provider).toBe('openai');
    });

    it('wirft Fehler wenn API Key fehlt', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => createLLMClient('anthropic')).toThrow('API Key');
    });

    it('wirft Fehler für unbekannten Provider', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => createLLMClient('unknown' as any)).toThrow('Unbekannter Provider');
    });
  });

  // --------------------------------------------
  // getDefaultProvider()
  // --------------------------------------------

  describe('getDefaultProvider()', () => {
    it('gibt anthropic als Standard zurück', () => {
      delete process.env.LLM_PROVIDER;
      expect(getDefaultProvider()).toBe('anthropic');
    });

    it('respektiert LLM_PROVIDER env', () => {
      process.env.LLM_PROVIDER = 'openai';
      expect(getDefaultProvider()).toBe('openai');
    });

    it('ignoriert ungültige Werte und nutzt Fallback', () => {
      process.env.LLM_PROVIDER = 'invalid-provider';
      expect(getDefaultProvider()).toBe('anthropic');
    });
  });
});
