import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock'
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers'

export const useBedrockModels = () => {
  const models = ref([])
  const loading = ref(false)
  const error = ref('')
  const config = useRuntimeConfig()

  const fetchModels = async () => {
    loading.value = true
    error.value = ''
    
    try {
      // Get credentials from Cognito Identity Pool
      const credentials = fromCognitoIdentityPool({
        clientConfig: { region: config.public.region },
        identityPoolId: config.public.identityPoolId,
        logins: {
          [`cognito-idp.${config.public.region}.amazonaws.com/${config.public.userPoolId}`]: localStorage.getItem('id_token')
        }
      })

      const bedrockClient = new BedrockClient({
        region: config.public.region,
        credentials
      })

      const command = new ListFoundationModelsCommand({})
      const response = await bedrockClient.send(command)
      
      models.value = response.modelSummaries?.map(model => ({
        modelId: model.modelId,
        modelName: model.modelName || model.modelId?.split('.').pop()?.replace(/-/g, ' ') || model.modelId
      })) || []
      
    } catch (err) {
      console.error('Failed to fetch Bedrock models:', err)
      error.value = 'Failed to load models'
      // Fallback to common models if API fails
      models.value = [
        { modelId: 'anthropic.claude-3-5-sonnet-20240620-v1:0', modelName: 'Claude 3.5 Sonnet' },
        { modelId: 'anthropic.claude-3-sonnet-20240229-v1:0', modelName: 'Claude 3 Sonnet' },
        { modelId: 'anthropic.claude-3-haiku-20240307-v1:0', modelName: 'Claude 3 Haiku' },
        { modelId: 'amazon.titan-text-premier-v1:0', modelName: 'Amazon Titan Text Premier' }
      ]
    } finally {
      loading.value = false
    }
  }

  return {
    models: readonly(models),
    loading: readonly(loading),
    error: readonly(error),
    fetchModels
  }
}