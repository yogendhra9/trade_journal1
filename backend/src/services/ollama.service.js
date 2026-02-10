/**
 * Ollama Service
 * 
 * Calls local Ollama API for LLM-based retrospective analysis.
 * All data stays local for confidentiality.
 */

import axios from 'axios';

// Constants will be read at runtime
const getOllamaUrl = () => process.env.OLLAMA_URL || 'http://localhost:11434';
const getDefaultModel = () => process.env.OLLAMA_MODEL || 'qwen2.5:3b';

/**
 * Generate a completion from Ollama
 * 
 * @param {string} prompt - The user prompt
 * @param {string} systemPrompt - The system context
 * @param {object} options - Generation options
 */
export const generate = async (prompt, systemPrompt = '', options = {}) => {
  const response = await axios.post(`${getOllamaUrl()}/api/generate`, {
    model: options.model || getDefaultModel(),
    prompt,
    system: systemPrompt,
    stream: false,
    options: {
      temperature: options.temperature || 0.7,
      num_predict: options.maxTokens || 1024
    }
  });

  return {
    text: response.data.response,
    model: response.data.model,
    totalDuration: response.data.total_duration,
    promptEvalCount: response.data.prompt_eval_count
  };
};

/**
 * Chat completion with message history
 */
export const chat = async (messages, systemPrompt = '', options = {}) => {
  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const response = await axios.post(`${getOllamaUrl()}/api/chat`, {
    model: options.model || getDefaultModel(),
    messages: formattedMessages,
    stream: false,
    options: {
      temperature: options.temperature || 0.7,
      num_predict: options.maxTokens || 1024
    }
  });

  return {
    message: response.data.message,
    model: response.data.model,
    totalDuration: response.data.total_duration
  };
};

/**
 * Check if Ollama is available
 */
export const healthCheck = async () => {
  try {
    const response = await axios.get(`${getOllamaUrl()}/api/tags`);
    return {
      available: true,
      models: response.data.models?.map(m => m.name) || []
    };
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
};

/**
 * List available models
 */
export const listModels = async () => {
  const response = await axios.get(`${getOllamaUrl()}/api/tags`);
  return response.data.models || [];
};
