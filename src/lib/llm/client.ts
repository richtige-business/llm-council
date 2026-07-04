// ============================================
// client.ts - LLM Client Factory
// 
// Zweck: Erstellt LLM Clients basierend auf Provider-Auswahl
// Verwendet von: API Routes
// ============================================

import { loadEnvConfig } from '@next/env';
import type { LLMClient, LLMProvider } from './types';
import { AnthropicProvider } from './providers/anthropic';
import { OpenAIProvider } from './providers/openai';

// --------------------------------------------
// Env Loader
// Stellt sicher, dass .env.local wirklich geladen ist
// --------------------------------------------

let envLoaded = false;

function ensureEnvLoaded() {
  if (!envLoaded) {
    loadEnvConfig(process.cwd());
    envLoaded = true;
  }
}

// --------------------------------------------
// Client Factory
// Erstellt den passenden LLM Client basierend auf Provider
// --------------------------------------------

export function createLLMClient(provider: LLMProvider): LLMClient {
  ensureEnvLoaded();
  const apiKey = getApiKeyForProvider(provider);
  
  if (!apiKey) {
    throw new Error(`API Key für Provider "${provider}" nicht gefunden. Bitte setze ${getEnvKeyForProvider(provider)} in der .env Datei.`);
  }

  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider(apiKey);
    case 'openai':
      return new OpenAIProvider(apiKey);
    default:
      throw new Error(`Unbekannter Provider: ${provider}`);
  }
}

// --------------------------------------------
// Helper: API Key für Provider holen
// --------------------------------------------

function getApiKeyForProvider(provider: LLMProvider): string | undefined {
  const envKey = getEnvKeyForProvider(provider);
  return process.env[envKey];
}

function getEnvKeyForProvider(provider: LLMProvider): string {
  switch (provider) {
    case 'anthropic':
      return 'ANTHROPIC_API_KEY';
    case 'openai':
      return 'OPENAI_API_KEY';
    default:
      throw new Error(`Unbekannter Provider: ${provider}`);
  }
}

// --------------------------------------------
// Helper: Standard Provider aus ENV holen
// --------------------------------------------

export function getDefaultProvider(): LLMProvider {
  const envProvider = process.env.LLM_PROVIDER;
  if (envProvider === 'openai' || envProvider === 'anthropic') {
    return envProvider;
  }
  // Fallback: OpenRouter ueber OpenAI-kompatiblen Client
  return 'openai';
}

// --------------------------------------------
// Helper: Verfügbare Modelle für Provider
// --------------------------------------------

export function getAvailableModels(provider: LLMProvider): Array<{ id: string; name: string; description?: string }> {
  const client = createLLMClient(provider);
  return client.getAvailableModels();
}
