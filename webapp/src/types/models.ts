import { generateModels, generateModelGroups } from '@/utils/modelGenerator';


export type AmazonImageTaskType =
	'TEXT_IMAGE' |
	'INPAINTING' |
	'OUTPAINTING' |
	'IMAGE_VARIATION' |
	'COLOR_GUIDED_GENERATION' |
	'BACKGROUND_REMOVAL' |
	'TEXT_VIDEO' |
	'IMAGE_VIDEO';

export type VideoQuality = 'standard' | 'premium';
export type VideoDimension = '1280x720' | '1920x1080';


export type AmazonControlMode = 'CANNY_EDGE' | 'SEGMENTATION';
export type AmazonOutpaintingMode = 'DEFAULT' | 'PRECISE';


export const STABILITY_ASPECT_RATIOS = [
	'1:1',
	'16:9',
	'4:3',
	'3:2',
	'2:1'
] as const;

export const STABILITY_OUTPUT_FORMATS = ['png', 'jpeg'] as const;

export const IMAGE_SIZES = [
	// 1:1 aspect ratio (square)
	'512x512',
	'768x768',
	'1024x1024',

	// 16:9 aspect ratio (widescreen)
	'1920x1080',
	'1280x720',
	'1152x648',
	'896x504',

	// 3:2 aspect ratio (classic photo)
	'1152x768',
	'768x512',

	// 2:3 aspect ratio (portrait photo)
	'768x1152',
	'512x768',

	// 4:3 aspect ratio (standard)
	'1024x768',
	'800x600',

	// 3:4 aspect ratio (portrait standard)
	'768x1024',
	'600x800',

	// 5:3 aspect ratio (widescreen alternative)
	'1280x768',
	'800x480',

	// 3:5 aspect ratio (tall portrait)
	'768x1280',
	'480x800',

	'custom'
] as const;

export const STABILITY_STYLE_PRESETS = [
	'enhance',
	'anime',
	'photographic',
	'digital-art',
	'comic-book',
	'fantasy-art',
	'line-art',
	'cinematic',
	'analog-film',
	'3d-model'
] as const;

export interface ModelParams {
	modelId: string;
	maxTokens: number;
	temperature: number;
	topP: number;
	maxTurns: number;

	// Image generation parameters
	imageSize?: typeof IMAGE_SIZES[number];
	imageWidth?: number;
	imageHeight?: number;
	numImages?: number;
	stylePreset?: typeof STABILITY_STYLE_PRESETS[number];
	quality?: 'standard' | 'premium';
	steps?: number;
	seed?: number;
	negativePrompt?: string;

	// Other existing parameters
	topK?: number;
	stopSequences?: string[];
	anthropicVersion?: string;

	// Stability AI specific params
	aspectRatio?: typeof STABILITY_ASPECT_RATIOS[number];
	outputFormat?: typeof STABILITY_OUTPUT_FORMATS[number];
	mode?: 'text-to-image' | 'image-to-image';
	strength?: number; // for image-to-image mode (0.0 to 1.0)

	// Amazon specific image params
	taskType?: AmazonImageTaskType;
	negativeText?: string;
	cfgScale?: number;
	controlMode?: AmazonControlMode;
	controlStrength?: number;
	similarityStrength?: number;
	maskPrompt?: string;
	maskImage?: string;
	returnMask?: boolean;
	outpaintingMode?: AmazonOutpaintingMode;
	colors?: string[];
	referenceImage?: string;

	// Video generation parameters
	videoQuality?: VideoQuality;
	videoDimension?: VideoDimension;
	durationSeconds?: number;
	fps?: number;
	videoTaskType?: 'TEXT_VIDEO' | 'IMAGE_VIDEO';

	extendedThinking?: boolean;
    budgetTokens?: number;

}

// 1. Core Enums with Descriptions
export enum ProviderType {
	Anthropic = 'Anthropic',
	Amazon = 'Amazon',
	Meta = 'Meta',
	MistralAI = 'Mistral AI',
	Cohere = 'Cohere',
	AI21Labs = 'AI21 Labs',
	StabilityAI = 'Stability AI',
	Google = 'Google',
	OpenAI = 'OpenAI',
	DeepSeek = 'DeepSeek',
	Groq = 'Groq',
	Sambanova = 'Sambanova',
	Mistral = 'Mistral'
}

export enum CategoryType {
	All = 'all',
	Text = 'text',
	Chat = 'chat',
	Image = 'image',
	Embedding = 'embedding',
	Multimodal = 'multimodal',
	Vector = 'vector',
	Search = 'search',
	Audio = 'audio',
	Video = 'video',

	// New categories from the Claude 3.5 Sonnet example
	Agents = 'agents',
	CodeGeneration = 'code generation',
	ComplexReasoningAnalysis = 'complex reasoning analysis',
	Conversation = 'conversation',
	ImageToText = 'image-to-text',
	Math = 'math',
	MultilingualSupport = 'multilingual support',
	NaturalLanguageProcessing = 'natural language processing',
	QuestionAnswering = 'question answering',
	RAG = 'rag',
	TextGeneration = 'text generation',
	TextSummarization = 'text summarization',
	TextToText = 'text-to-text',
	Translation = 'translation',
	TextToVideo = "text-to-video",
	ImageToVideo = "image-to-video",
	TextToImage = 'text-to-image',
	ImageToImage = 'image-to-image',
	ContentModeration = 'content-moderation'
}

export enum TierType {
	Free = 'free',
	Basic = 'basic',
	Standard = 'standard',
	Premium = 'premium',
	Enterprise = 'enterprise',
	Preview = 'preview'
}

// 2. Utility Types
export type Modality = 'chat' | 'text' | 'image' | 'video' | 'audio' | 'embedding';
export type Status = 'stable' | 'beta' | 'alpha' | 'deprecated' | 'preview';
export type Region = 'us-east-1' | 'us-west-2' | 'eu-west-1' | 'ap-southeast-1' | string;

// 3. Enhanced Parameter Interfaces
export interface ModelParameters {
	supportsTemperature: boolean;
	supportsTopP: boolean;
	supportsTopK?: boolean;
	supportsFrequencyPenalty?: boolean;
	supportsPresencePenalty?: boolean;
	supportsSamplingMethods?: boolean;
	supportsExtendedThinking?: boolean;
	defaultValues: {
		temperature?: number;
		topP?: number;
		topK?: number;
		frequencyPenalty?: number;
		presencePenalty?: number;
		maxTokens?: number;
		quality?: string,
		size?: string,
		durationSeconds?: number,
		fps?: number,
		dimension?: string
	};
	limits: {
		minTemperature?: number;
		maxTemperature?: number;
		minTopP?: number;
		maxTopP?: number;
		minTopK?: number;
		maxTopK?: number;
		minTokens?: number;
		maxTokens?: number;
		maxDuration?: number;
		minDuration?: number;
	};
}

export interface ModelFeatures {
	contextWindow: number;
	multilingual: boolean;
	formatting?: boolean;
	imageAnalysis?: boolean;
	imageGeneration?: boolean;
	multimodal?: boolean;
	finetuning?: boolean;
	customTraining?: boolean;
	streamingSupport?: boolean;
	supportedLanguages?: string[];
	supportedFormats?: string[];
	[key: string]: any;
}

export interface ModelUseCase {
	recommended: string[];
	notRecommended: string[];
	examples?: string[];
	limitations?: string[];
	bestPractices?: string[];
}

// 4. Pricing and Usage Information
export interface ModelPricing {
	inputCost: number;    // Cost per 1K input tokens
	outputCost: number;   // Cost per 1K output tokens
	currency: string;     // USD, EUR, etc.
	billingUnit?: string; // tokens, characters, images, etc.
}

// 5. Main Model Interface
export interface ModelOption {
	id: string;
	name: string;
	provider: ProviderType;
	version: string;
	category: CategoryType[];  // Allow multiple categories
	tier: TierType;
	description: string;
	longDescription?: string;
	capabilities: string[];
	inputModalities: Modality[];
	outputModalities: Modality[];
	maxInputTokens: number;
	maxOutputTokens?: number;
	streaming: boolean;
	regions: Region[];
	parameters: ModelParameters;
	features: ModelFeatures;
	useCase?: ModelUseCase;
	status: Status;
	lastUpdated: string;
	pricing?: ModelPricing;
	documentation?: string;  // URL to documentation
	restrictions?: string[]; // Usage restrictions
	compliance?: string[];  // Compliance certifications
	uptime?: number;       // Historical uptime percentage
	requiresApiKey?: boolean;
}

// 6. Group Organization
export interface ModelGroup {
	name: string;
	description: string;
	models: ModelOption[];
	category?: CategoryType;
	provider?: ProviderType;
	isPublic?: boolean;
	tags?: string[];
	metadata?: Record<string, any>;
}

// 7. API Response Types
export interface ModelListResponse {
	models: ModelOption[];
	total: number;
	page?: number;
	pageSize?: number;
	hasMore?: boolean;
}

export interface ModelGroupResponse {
	groups: ModelGroup[];
	total: number;
}

export const MODELS = generateModels()
export const MODEL_GROUPS = generateModelGroups(MODELS)
