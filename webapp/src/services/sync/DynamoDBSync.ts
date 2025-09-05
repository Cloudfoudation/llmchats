import { DynamoDBClient, PutItemCommand, QueryCommand, DeleteItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Conversation } from '@/types/chat';
import { Agent } from '@/types/agent';
import { ModelParams } from '@/types/models';
import { fetchAuthSession } from 'aws-amplify/auth';
import { SyncableEntity } from '@/types/sync';

export class DynamoDBSync {
	private dynamoClient: DynamoDBClient | null = null;
	private s3Client: S3Client | null = null;
	private userId: string | null = null;
	private static instance: DynamoDBSync;

	public constructor() { }

	static getInstance(): DynamoDBSync {
		if (!DynamoDBSync.instance) {
			DynamoDBSync.instance = new DynamoDBSync();
		}
		return DynamoDBSync.instance;
	}

	async initialize(userId: string): Promise<void> {
		try {
			const session = await fetchAuthSession();
			if (!session.credentials) throw new Error('No credentials');

			this.dynamoClient = new DynamoDBClient({
				credentials: session.credentials,
				region: process.env.NEXT_PUBLIC_AWS_REGION
			});

			this.s3Client = new S3Client({
				credentials: session.credentials,
				region: process.env.NEXT_PUBLIC_AWS_REGION
			});

			this.userId = userId;
		} catch (error) {
			console.error('Failed to initialize DynamoDBSync:', error);
			throw error;
		}
	}

	private checkInitialization() {
		if (!this.dynamoClient || !this.s3Client || !this.userId) {
			throw new Error('DynamoDBSync not initialized');
		}
	}

	// Modified conversation sync methods
	async syncConversation(conversation: Conversation): Promise<void> {
		this.checkInitialization();

		try {
			// Store full conversation in S3
			const s3Key = `${this.userId}/${conversation.id}.json`;
			await this.s3Client!.send(new PutObjectCommand({
				Bucket: process.env.NEXT_PUBLIC_ATTACHMENTS_BUCKET!,
				Key: s3Key,
				Body: JSON.stringify(conversation),
				ContentType: 'application/json'
			}));

			// Store conversation metadata in DynamoDB
			const metadata = {
				userId: { S: this.userId! },
				id: { S: conversation.id },
				title: { S: conversation.title },
				createdAt: { N: conversation.createdAt.toString() },
				lastEditedAt: { N: conversation.lastEditedAt.toString() },
				version: { N: conversation.version.toString() },
				messageCount: { N: conversation.messages.length.toString() }
			};

			await this.dynamoClient!.send(new PutItemCommand({
				TableName: process.env.NEXT_PUBLIC_CONVERSATIONS_TABLE!,
				Item: metadata
			}));
		} catch (error) {
			console.error('Failed to sync conversation:', error);
			throw error;
		}
	}

	async fetchConversation(id: string): Promise<Conversation | null> {
		this.checkInitialization();

		try {
			const s3Key = `${this.userId}/${id}.json`;
			const response = await this.s3Client!.send(new GetObjectCommand({
				Bucket: process.env.NEXT_PUBLIC_ATTACHMENTS_BUCKET!,
				Key: s3Key
			}));

			if (!response.Body) return null;

			let bodyContents: string;
			if (response.Body instanceof Blob) {
				bodyContents = await response.Body.text();
			} else {
				const stream = response.Body as ReadableStream;
				const reader = stream.getReader();
				const chunks: Uint8Array[] = [];

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					chunks.push(value);
				}

				// Correct way to concatenate Uint8Arrays
				const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
				const concatenated = new Uint8Array(totalLength);
				let offset = 0;
				for (const chunk of chunks) {
					concatenated.set(chunk, offset);
					offset += chunk.length;
				}

				bodyContents = new TextDecoder().decode(concatenated);
			}

			return JSON.parse(bodyContents) as Conversation;

		} catch (error) {
			console.error('Failed to fetch conversation:', error);
			return null;
		}
	}

	async fetchAllConversationMetadata(): Promise<Array<{ id: string; version: number; lastEditedAt: number }>> {
		this.checkInitialization();

		try {
			const response = await this.dynamoClient!.send(new QueryCommand({
				TableName: process.env.NEXT_PUBLIC_CONVERSATIONS_TABLE!,
				KeyConditionExpression: 'userId = :userId',
				ExpressionAttributeValues: {
					':userId': { S: this.userId! }
				}
			}));

			if (!response.Items) return [];

			return response.Items.map(item => ({
				id: item.id.S!,
				version: parseInt(item.version.N!),
				lastEditedAt: parseInt(item.lastEditedAt.N!)
			}));
		} catch (error) {
			console.error('Failed to fetch conversation metadata:', error);
			throw error;
		}
	}

	async fetchConversationMetadata(id: string) {
		this.checkInitialization();

		try {
			const response = await this.dynamoClient!.send(new GetItemCommand({
				TableName: process.env.NEXT_PUBLIC_CONVERSATIONS_TABLE!,
				Key: {
					userId: { S: this.userId! },
					id: { S: id }
				}
			}));

			if (!response.Item) return null;

			return {
				id: response.Item.id.S,
				version: parseInt(response.Item.version.N!),
				lastEditedAt: parseInt(response.Item.lastEditedAt.N!)
			};
		} catch (error) {
			console.error('Failed to fetch conversation metadata:', error);
			return null;
		}
	}

	/**
	 * Fetch conversations in batches for better performance
	 */
	async fetchConversationsBatch(conversationIds: string[]): Promise<(Conversation | null)[]> {
		this.checkInitialization();

		try {
			const fetchPromises = conversationIds.map(id => this.fetchConversation(id));
			return await Promise.all(fetchPromises);
		} catch (error) {
			console.error('Failed to fetch conversation batch:', error);
			throw error;
		}
	}

	/**
	 * Optimized method to fetch conversation metadata with pagination support
	 */
	async fetchConversationMetadataBatch(
		lastEvaluatedKey?: Record<string, any>,
		limit: number = 50
	): Promise<{
		items: Array<{ id: string; version: number; lastEditedAt: number }>;
		lastEvaluatedKey?: Record<string, any>;
	}> {
		this.checkInitialization();

		try {
			const queryParams: any = {
				TableName: process.env.NEXT_PUBLIC_CONVERSATIONS_TABLE!,
				KeyConditionExpression: 'userId = :userId',
				ExpressionAttributeValues: {
					':userId': { S: this.userId! }
				},
				Limit: limit
			};

			if (lastEvaluatedKey) {
				queryParams.ExclusiveStartKey = lastEvaluatedKey;
			}

			const response = await this.dynamoClient!.send(new QueryCommand(queryParams));

			const items = (response.Items || []).map(item => ({
				id: item.id.S!,
				version: parseInt(item.version.N!),
				lastEditedAt: parseInt(item.lastEditedAt.N!)
			}));

			return {
				items,
				lastEvaluatedKey: response.LastEvaluatedKey
			};
		} catch (error) {
			console.error('Failed to fetch conversation metadata batch:', error);
			throw error;
		}
	}

	async fetchAllConversations(): Promise<Conversation[]> {
		this.checkInitialization();

		try {
			// First get all conversation metadata from DynamoDB
			const response = await this.dynamoClient!.send(new QueryCommand({
				TableName: process.env.NEXT_PUBLIC_CONVERSATIONS_TABLE!,
				KeyConditionExpression: 'userId = :userId',
				ExpressionAttributeValues: {
					':userId': { S: this.userId! }
				}
			}));

			if (!response.Items) return [];

			const conversations = await Promise.all(
				response.Items.map(item => {
					if (!item.id?.S) {
						throw new Error('Invalid conversation ID');
					}
					return this.fetchConversation(item.id.S);
				})
			);
			return conversations.filter((c): c is Conversation => c !== null);

		} catch (error) {
			console.error('Failed to fetch all conversations:', error);
			throw error;
		}
	}

	async deleteConversation(id: string): Promise<void> {
		this.checkInitialization();

		try {
			// Delete from S3
			const s3Key = `${this.userId}/${id}.json`;
			await this.s3Client!.send(new DeleteObjectCommand({
				Bucket: process.env.NEXT_PUBLIC_ATTACHMENTS_BUCKET!,
				Key: s3Key
			}));

			// Delete from DynamoDB
			await this.dynamoClient!.send(new DeleteItemCommand({
				TableName: process.env.NEXT_PUBLIC_CONVERSATIONS_TABLE!,
				Key: {
					userId: { S: this.userId! },
					id: { S: id }
				}
			}));
		} catch (error) {
			console.error('Failed to delete conversation:', error);
			throw error;
		}
	}

	async syncEntity<T extends SyncableEntity>(
		entity: T,
		tableName: string,
		marshall: (item: T) => Record<string, any>
	): Promise<void> {
		this.checkInitialization();

		if (!entity) {
			throw new Error('Entity is undefined');
		}

		if (!tableName) {
			throw new Error('Table name is undefined');
		}

		try {
			// Marshall the entity first
			const marshalledItem = marshall(entity);

			// Ensure we have a valid marshalled item
			if (!marshalledItem) {
				throw new Error('Failed to marshall entity');
			}

			// Add userId to the item
			const itemWithUserId = {
				userId: { S: this.userId! },
				...marshalledItem
			};

			// Send the put request
			await this.dynamoClient!.send(new PutItemCommand({
				TableName: tableName,
				Item: itemWithUserId
			}));
		} catch (error) {
			console.error(`Failed to sync entity to ${tableName}:`, error);
			throw new Error(`Failed to sync entity: ${(error as Error).message}`);
		}
	}

	async fetchEntity<T>(
		id: string,
		tableName: string,
		unmarshall: (item: Record<string, any>) => T
	): Promise<T | null> {
		this.checkInitialization();

		try {
			const response = await this.dynamoClient!.send(new GetItemCommand({
				TableName: tableName,
				Key: {
					userId: { S: this.userId! },
					id: { S: id }
				}
			}));

			return response.Item ? unmarshall(response.Item) : null;
		} catch (error) {
			console.error(`Failed to fetch entity from ${tableName}:`, error);
			throw error;
		}
	}

	async fetchAllEntities<T>(
		tableName: string,
		unmarshall: (item: Record<string, any>) => T
	): Promise<T[]> {
		this.checkInitialization();

		try {
			const response = await this.dynamoClient!.send(new QueryCommand({
				TableName: tableName,
				KeyConditionExpression: 'userId = :userId',
				ExpressionAttributeValues: {
					':userId': { S: this.userId! }
				}
			}));

			return (response.Items || []).map(item => unmarshall(item));
		} catch (error) {
			console.error(`Failed to fetch all entities from ${tableName}:`, error);
			throw error;
		}
	}

	async deleteEntity(id: string, tableName: string): Promise<void> {
		this.checkInitialization();

		try {
			console.log(`Deleting entity with id ${id} from table ${tableName}`);
			await this.dynamoClient!.send(new DeleteItemCommand({
				TableName: tableName,
				Key: {
					userId: { S: this.userId! },
					id: { S: id }
				}
			}));
		} catch (error) {
			console.error(`Failed to delete entity from ${tableName}:`, error);
			throw error;
		}
	}

	async syncAgent(agent: Agent): Promise<void> {
		return this.syncEntity(
			agent,
			process.env.NEXT_PUBLIC_AGENTS_TABLE!,
			this.marshallAgent.bind(this)
		);
	}

	async deleteAgent(agentId: string): Promise<void> {
		return this.deleteEntity(
			agentId,
			process.env.NEXT_PUBLIC_AGENTS_TABLE!
		);
	}

	private marshallModelParams(params: ModelParams) {
		const marshalled: Record<string, any> = {
			modelId: { S: params.modelId },
			maxTokens: { N: params.maxTokens.toString() },
			temperature: { N: params.temperature.toString() },
			topP: { N: params.topP.toString() },
			maxTurns: { N: params.maxTurns.toString() },
		};

		// Optional parameters
		if (params.imageSize) marshalled.imageSize = { S: params.imageSize };
		if (params.imageWidth) marshalled.imageWidth = { N: params.imageWidth.toString() };
		if (params.imageHeight) marshalled.imageHeight = { N: params.imageHeight.toString() };
		if (params.numImages) marshalled.numImages = { N: params.numImages.toString() };
		if (params.stylePreset) marshalled.stylePreset = { S: params.stylePreset };
		if (params.quality) marshalled.quality = { S: params.quality };
		if (params.steps) marshalled.steps = { N: params.steps.toString() };
		if (params.seed) marshalled.seed = { N: params.seed.toString() };
		if (params.negativePrompt) marshalled.negativePrompt = { S: params.negativePrompt };
		if (params.topK) marshalled.topK = { N: params.topK.toString() };
		if (params.stopSequences) marshalled.stopSequences = { L: params.stopSequences.map(s => ({ S: s })) };
		if (params.anthropicVersion) marshalled.anthropicVersion = { S: params.anthropicVersion };
		if (params.aspectRatio) marshalled.aspectRatio = { S: params.aspectRatio };
		if (params.outputFormat) marshalled.outputFormat = { S: params.outputFormat };
		if (params.mode) marshalled.mode = { S: params.mode };
		if (params.strength) marshalled.strength = { N: params.strength.toString() };
		if (params.taskType) marshalled.taskType = { S: params.taskType };
		if (params.negativeText) marshalled.negativeText = { S: params.negativeText };
		if (params.cfgScale) marshalled.cfgScale = { N: params.cfgScale.toString() };
		if (params.controlMode) marshalled.controlMode = { S: params.controlMode };
		if (params.controlStrength) marshalled.controlStrength = { N: params.controlStrength.toString() };
		if (params.similarityStrength) marshalled.similarityStrength = { N: params.similarityStrength.toString() };
		if (params.maskPrompt) marshalled.maskPrompt = { S: params.maskPrompt };
		if (params.maskImage) marshalled.maskImage = { S: params.maskImage };
		if (params.returnMask !== undefined) marshalled.returnMask = { BOOL: params.returnMask };
		if (params.outpaintingMode) marshalled.outpaintingMode = { S: params.outpaintingMode };
		if (params.colors) marshalled.colors = { L: params.colors.map(c => ({ S: c })) };
		if (params.referenceImage) marshalled.referenceImage = { S: params.referenceImage };
		if (params.videoQuality) marshalled.videoQuality = { S: params.videoQuality };
		if (params.videoDimension) marshalled.videoDimension = { S: params.videoDimension };
		if (params.durationSeconds) marshalled.durationSeconds = { N: params.durationSeconds.toString() };
		if (params.fps) marshalled.fps = { N: params.fps.toString() };
		if (params.videoTaskType) marshalled.videoTaskType = { S: params.videoTaskType };

		return marshalled;
	}

	public marshallAgent(agent: Agent) {
		if (!agent) {
			throw new Error('Agent is undefined');
		}

		// Validate required fields
		if (!agent.id || !agent.name || !agent.description || !agent.systemPrompt || !agent.modelParams) {
			throw new Error('Missing required Agent fields');
		}

		try {
			const marshalledAgent: Record<string, any> = {
				id: { S: agent.id },
				name: { S: agent.name },
				description: { S: agent.description },
				systemPrompt: { S: agent.systemPrompt },
				modelParams: { M: this.marshallModelParams(agent.modelParams) },
				createdAt: { N: agent.createdAt.toString() },
				lastEditedAt: { N: agent.lastEditedAt.toString() },
				version: { N: agent.version.toString() },
			};

			if (agent.knowledgeBaseId) {
				marshalledAgent.knowledgeBaseId = { S: agent.knowledgeBaseId };
			}

			if (agent.telegramToken) {
				marshalledAgent.telegramToken = { S: agent.telegramToken };
			}

			return marshalledAgent;
		} catch (error) {
			console.error('Error marshalling agent:', error);
			throw new Error(`Failed to sync entity: ${(error as Error).message}`);
		}
	}

	// Unmarshalling functions
	private unmarshallModelParams(params: Record<string, any>): ModelParams {
		const result: ModelParams = {
			modelId: params.modelId.S,
			maxTokens: parseInt(params.maxTokens.N),
			temperature: parseFloat(params.temperature.N),
			topP: parseFloat(params.topP.N),
			maxTurns: parseInt(params.maxTurns.N),
		};

		// Image generation parameters
		if (params.imageSize) result.imageSize = params.imageSize.S;
		if (params.imageWidth) result.imageWidth = parseInt(params.imageWidth.N);
		if (params.imageHeight) result.imageHeight = parseInt(params.imageHeight.N);
		if (params.numImages) result.numImages = parseInt(params.numImages.N);
		if (params.stylePreset) result.stylePreset = params.stylePreset.S;
		if (params.quality) result.quality = params.quality.S;
		if (params.steps) result.steps = parseInt(params.steps.N);
		if (params.seed) result.seed = parseInt(params.seed.N);
		if (params.negativePrompt) result.negativePrompt = params.negativePrompt.S;

		// Other parameters
		if (params.topK) result.topK = parseInt(params.topK.N);
		if (params.stopSequences) {
			result.stopSequences = params.stopSequences.L.map((item: any) => item.S);
		}
		if (params.anthropicVersion) result.anthropicVersion = params.anthropicVersion.S;

		// Stability AI specific params
		if (params.aspectRatio) result.aspectRatio = params.aspectRatio.S;
		if (params.outputFormat) result.outputFormat = params.outputFormat.S;
		if (params.mode) result.mode = params.mode.S;
		if (params.strength) result.strength = parseFloat(params.strength.N);

		// Amazon specific image params
		if (params.taskType) result.taskType = params.taskType.S;
		if (params.negativeText) result.negativeText = params.negativeText.S;
		if (params.cfgScale) result.cfgScale = parseFloat(params.cfgScale.N);
		if (params.controlMode) result.controlMode = params.controlMode.S;
		if (params.controlStrength) result.controlStrength = parseFloat(params.controlStrength.N);
		if (params.similarityStrength) result.similarityStrength = parseFloat(params.similarityStrength.N);
		if (params.maskPrompt) result.maskPrompt = params.maskPrompt.S;
		if (params.maskImage) result.maskImage = params.maskImage.S;
		if (params.returnMask !== undefined) result.returnMask = params.returnMask.BOOL;
		if (params.outpaintingMode) result.outpaintingMode = params.outpaintingMode.S;
		if (params.colors) {
			result.colors = params.colors.L.map((item: any) => item.S);
		}
		if (params.referenceImage) result.referenceImage = params.referenceImage.S;

		// Video generation parameters
		if (params.videoQuality) result.videoQuality = params.videoQuality.S;
		if (params.videoDimension) result.videoDimension = params.videoDimension.S;
		if (params.durationSeconds) result.durationSeconds = parseInt(params.durationSeconds.N);
		if (params.fps) result.fps = parseInt(params.fps.N);
		if (params.videoTaskType) result.videoTaskType = params.videoTaskType.S;

		return result;
	}

	public unmarshallAgent(item: Record<string, any>): Agent {
		return {
			id: item.id.S,
			name: item.name.S,
			description: item.description.S,
			systemPrompt: item.systemPrompt.S,
			type: 'custom',
			modelParams: this.unmarshallModelParams(item.modelParams.M),
			createdAt: parseInt(item.createdAt.N),
			lastEditedAt: parseInt(item.lastEditedAt.N),
			version: parseInt(item.version.N),
			knowledgeBaseId: item.knowledgeBaseId?.S,
			telegramToken: item.telegramToken?.S
		};
	}
}

export const dynamoSync = new DynamoDBSync();