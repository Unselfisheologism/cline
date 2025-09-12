import { ApiHandlerOptions, ModelInfo } from "@shared/api"
import { ApiHandler } from "../../core/api/index"
import { ApiStream } from "../../core/api/transform/stream"
import Anthropic from "@anthropic-ai/sdk";
// Define the global puter interface based on puter.js documentation
declare global {
	namespace globalThis {
		interface Window {
			puter: any
		}
	}
	var puter: any
}



export class PuterHandler implements ApiHandler {
	private options: ApiHandlerOptions
	private puterClient: any



	constructor(options: ApiHandlerOptions) {
		this.options = options



		// Initialize puter client
		// We'll load puter.js dynamically to avoid issues if it's not available
		this.initializePuter()
	}



	private async initializePuter() {
		try {
			// Check if puter is already available (should be loaded via script tag)
			if (typeof puter !== "undefined") {
				this.puterClient = puter
			} else if (typeof window !== "undefined" && window.puter) {
				this.puterClient = window.puter
			} else {
				// Load puter.js dynamically if not available
				await this.loadPuterScript()
			}
		} catch (error) {
			throw new Error(`Failed to initialize Puter client: ${error.message as string}`)
		}
	}



	private async loadPuterScript() {
		return new Promise<void>((resolve, reject) => {
			const script = document.createElement("script")
			script.src = "https://js.puter.com/v2/"
			script.async = true
			script.onload = () => {
				this.puterClient = (window as any).puter || puter
				resolve()
			}
			script.onerror = () => {
				reject(new Error("Failed to load Puter.js script"))
			}
			document.head.appendChild(script)
		})
	}



	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		await this.ensurePuterInitialized()



		// Convert messages to puter format
		const prompt = this.convertMessagesToPrompt(systemPrompt, messages)
		// Determine which modelId to use based on mode
		// Since we don't have access to the current mode in this context,
		// we'll need to use the mode from when the handler was created
		// For now, default to plan mode, but this should be refactored later
		const modelId = (this.options as any).planModeApiModelId || (this.options as any).actModeApiModelId || "gpt-5-nano"



		try {
			const response = await this.puterClient.ai.chat(prompt, {
				model: modelId,
				stream: true,
				max_tokens: this.getModelInfo().maxTokens || 8192,
				temperature: 0.7,
			})



			// Handle streaming response
			for await (const chunk of response) {
				if (chunk?.text) {
					yield {
						type: "text",
						text: chunk.text,
					}
				}
			}



			// Yield usage information (if available from puter)
			if (response.usage) {
				yield {
					type: "usage",
					inputTokens: response.usage.prompt_tokens || 0,
					outputTokens: response.usage.completion_tokens || 0,
					totalCost: 0, // Puter is free for users
				}
			}
		} catch (error: any) {
			console.error("[PuterHandler] Error:", error)
			throw new Error(`Puter API error: ${error.message as string}`)
		}
	}



	private async ensurePuterInitialized() {
		// Wait for puter to be initialized if not already done
		let attempts = 0
		while (!this.puterClient && attempts < 50) {
			await new Promise((resolve) => setTimeout(resolve, 100))
			attempts++
		}



		if (!this.puterClient) {
			throw new Error("Puter client not initialized")
		}
	}



	private convertMessagesToPrompt(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): { system: string; messages: any[] } {
	// Convert anthropic message format to puter format
	const convertedMessages = messages.map(message => {
		const role = message.role;
		let content = [];

		if (Array.isArray(message.content)) {
			content = message.content.map((c: any) => {
				if (c.type === "text") {
					return { type: "text", text: c.text };
				} else if (c.type === "image_url") {
					// Handle image content
					return {
						type: "image",
						source: {
							type: "base64",
							media_type: c.image_url.url.split(";")[0].split(":")[1],
							data: c.image_url.url.split(",")[1]
						}
					};
				}
				return c;
			});
		} else {
			content = [{ type: "text", text: message.content as string }];
		}

		return {
			role: role,
			content: content
		};
	});

	return {
		system: systemPrompt,
		messages: convertedMessages
	};
}


	getModel(): { id: string; info: ModelInfo } {
		const modelId = (this.options as any).planModeApiModelId || (this.options as any).actModeApiModelId || "gpt-5-nano"
		const modelInfo = this.getModelInfo()



		return {
			id: modelId,
			info: modelInfo,
		}
	}



	private getModelInfo(): ModelInfo {
		const modelId = (this.options as any).planModeApiModelId || (this.options as any).actModeApiModelId || "gpt-5-nano"



		// Get model info from the puter models
		const model = puterModels[modelId as keyof typeof puterModels]



		if (model) {
			return model
		}



		// Fallback to default model info
		return {
			maxTokens: 8192,
			contextWindow: 128000,
			supportsImages: true,
			supportsPromptCache: true,
			inputPrice: 0,
			outputPrice: 0,
			description: `Puter AI model: ${modelId}`,
		}
	}
}



// Model configurations based on puter.js documentation
export const puterDefaultModelId = "gpt-5-2025-08-07"



export const puterModels = {
	// Original Puter models
	"gpt-5-2025-08-07": {
		maxTokens: 8192,
		contextWindow: 272000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "GPT-5 - Advanced reasoning model from OpenAI with 272K context window",
	},
	"gpt-5-mini-2025-08-07": {
		maxTokens: 8192,
		contextWindow: 272000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "GPT-5 Mini - Efficient version of GPT-5 for faster responses",
	},
	"gpt-5-nano-2025-08-07": {
		maxTokens: 8192,
		contextWindow: 272000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "GPT-5 Nano - Lightweight version of GPT-5 optimized for speed",
	},
	// Claude models
	claude: {
		maxTokens: 4096,
		contextWindow: 100000,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "Anthropic's Claude - Advanced conversational AI",
	},
	"claude-sonnet-4": {
		maxTokens: 8192,
		contextWindow: 200000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "Claude Sonnet 4 - Latest Sonnet model with advanced reasoning",
	},
	"claude-opus-4": {
		maxTokens: 8192,
		contextWindow: 200000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "Claude Opus 4 - Most powerful Claude model for complex tasks",
	},
	"claude-3-7-sonnet": {
		maxTokens: 8192,
		contextWindow: 200000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "Claude 3.7 Sonnet - Latest Claude model with extended thought",
	},
	"claude-3-5-sonnet": {
		maxTokens: 8192,
		contextWindow: 200000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "Claude 3.5 Sonnet - Balanced high-performance model",
	},
	// OpenAI models
	"gpt-4o-mini": {
		maxTokens: 16384,
		contextWindow: 128000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "GPT-4o Mini - Fast and efficient GPT-4 variant",
	},
	"gpt-4o": {
		maxTokens: 4096,
		contextWindow: 128000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "GPT-4o - Multimodal GPT-4 model with vision capabilities",
	},
	o1: {
		maxTokens: 100000,
		contextWindow: 200000,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "OpenAI o1 - Reasoning-optimized model",
	},
	"o1-mini": {
		maxTokens: 65536,
		contextWindow: 128000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "OpenAI o1 Mini - Faster version of o1 for reasoning tasks",
	},
	"o1-pro": {
		maxTokens: 100000,
		contextWindow: 200000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "OpenAI o1 Pro - Enhanced reasoning capabilities",
	},
	o3: {
		maxTokens: 100000,
		contextWindow: 200000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "OpenAI o3 - Latest reasoning model with advanced capabilities",
	},
	"o3-mini": {
		maxTokens: 100000,
		contextWindow: 200000,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "OpenAI o3 Mini - Efficient version of o3 for faster responses",
	},
	"o4-mini": {
		maxTokens: 100000,
		contextWindow: 200000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "OpenAI o4 Mini - Advanced mini model with reasoning capabilities",
	},
	"gpt-4.1": {
		maxTokens: 32768,
		contextWindow: 1048576,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "GPT-4.1 - Large context window model for complex tasks",
	},
	"gpt-4.1-mini": {
		maxTokens: 32768,
		contextWindow: 1048576,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "GPT-4.1 Mini - Efficient version with large context",
	},
	"gpt-4.1-nano": {
		maxTokens: 32768,
		contextWindow: 1048576,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "GPT-4.1 Nano - Lightweight version with large context",
	},
	"gpt-4.5-preview": {
		maxTokens: 32768,
		contextWindow: 128000,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "GPT-4.5 Preview - Preview of next-gen GPT model",
	},
	// DeepSeek models
	"deepseek-chat": {
		maxTokens: 8000,
		contextWindow: 128000,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "DeepSeek Chat - Advanced conversational AI",
	},
	"deepseek-reasoner": {
		maxTokens: 8000,
		contextWindow: 128000,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "DeepSeek Reasoner - Specialized for reasoning tasks",
	},
	// Google Gemini models
	"google/gemini-2.5-flash-preview": {
		maxTokens: 8192,
		contextWindow: 1048576,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "Gemini 2.5 Flash Preview - Fast multimodal model",
	},
	"google/gemini-2.5-flash-preview:thinking": {
		maxTokens: 65536,
		contextWindow: 1048576,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "Gemini 2.5 Flash Preview with thinking - Advanced reasoning",
	},
	"google/gemini-2.0-flash-lite-001": {
		maxTokens: 8192,
		contextWindow: 1048576,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "Gemini 2.0 Flash Lite - Lightweight flash model",
	},
	"google/gemini-2.0-flash-001": {
		maxTokens: 8192,
		contextWindow: 1048576,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "Gemini 2.0 Flash - Balanced performance model",
	},
	"google/gemini-pro-1.5": {
		maxTokens: 8192,
		contextWindow: 2097152,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "Gemini Pro 1.5 - Large context window model",
	},
	// Meta Llama models
	"meta-llama/llama-4-maverick": {
		maxTokens: 8192,
		contextWindow: 131072,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "Llama 4 Maverick - Meta's multimodal model",
	},
	"meta-llama/llama-4-scout": {
		maxTokens: 8192,
		contextWindow: 131072,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "Llama 4 Scout - Efficient multimodal model",
	},
	"meta-llama/llama-3.3-70b-instruct": {
		maxTokens: 4096,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "Llama 3.3 70B - Large parameter instruction-tuned model",
	},
	"meta-llama/llama-3.2-3b-instruct": {
		maxTokens: 4096,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "Llama 3.2 3B - Efficient instruction-tuned model",
	},
	"meta-llama/llama-3.2-1b-instruct": {
		maxTokens: 4096,
		contextWindow: 32768,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "Llama 3.2 1B - Lightweight instruction-tuned model",
	},
	"meta-llama/llama-3.1-8b-instruct": {
		maxTokens: 8192,
		contextWindow: 128000,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "Llama 3.1 8B - Mid-range instruction-tuned model",
	},
	"meta-llama/llama-3.1-405b-instruct": {
		maxTokens: 4096,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "Llama 3.1 405B - Very large parameter model",
	},
	"meta-llama/llama-3.1-70b-instruct": {
		maxTokens: 8192,
		contextWindow: 128000,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "Llama 3.1 70B - Large instruction-tuned model",
	},
	"meta-llama/llama-3-70b-instruct": {
		maxTokens: 8192,
		contextWindow: 8192,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "Llama 3 70B - Original Llama 3 large model",
	},
	// Mistral models
	"mistral-large-latest": {
		maxTokens: 131000,
		contextWindow: 131000,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "Mistral Large - Latest large model",
	},
	"codestral-latest": {
		maxTokens: 256000,
		contextWindow: 256000,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "Codestral - Latest coding assistant model",
	},
	"google/gemma-2-27b-it": {
		maxTokens: 4096,
		contextWindow: 8192,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "Gemma 2 27B - Google's instruction-tuned model",
	},
	// xAI models
	"grok-beta": {
		maxTokens: 8192,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		description: "Grok Beta - xAI's helpful and maximally truthful AI",
	},
	grok4: {
		maxTokens: 8192,
		contextWindow: 262144,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description: "Grok-4 - xAI's latest model with enhanced reasoning",
	},
} as const satisfies Record<string, ModelInfo>



export type PuterModelId = keyof typeof puterModels



