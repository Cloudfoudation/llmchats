import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers'

// SOLID Principles: Dependency Inversion - depends on abstractions
export const useChatService = () => {
  const config = useRuntimeConfig()
  const { user } = useAuth()
  
  // Single Responsibility: Handle chat messaging only
  const sendChatMessage = async (message: string, conversationHistory: any[] = []): Promise<string> => {
    try {
      // Get tokens for AWS credentials
      const idToken = process.client ? localStorage.getItem('id_token') : null
      
      if (!idToken) {
        throw new Error('No authentication token available')
      }
      
      // Create Bedrock client with Cognito credentials
      const client = new BedrockRuntimeClient({
        region: config.public.region,
        credentials: fromCognitoIdentityPool({
          clientConfig: { region: config.public.region },
          identityPoolId: config.public.identityPoolId,
          logins: {
            [`cognito-idp.${config.public.region}.amazonaws.com/${config.public.userPoolId}`]: idToken
          }
        })
      })
      
      // Format messages for Nova Pro
      const messages = conversationHistory.map(msg => ({
        role: msg.role,
        content: [{ text: msg.content }]
      }))
      
      messages.push({
        role: 'user',
        content: [{ text: message }]
      })
      
      const requestBody = {
        schemaVersion: 'messages-v1',
        system: [{
          text: 'You are a helpful AI assistant for GSIS (Government Service Insurance System) in the Philippines. Provide accurate information about GSIS benefits, retirement, loans, and services. Respond in the same language as the user (English, Tagalog, etc.).'
        }],
        messages,
        inferenceConfig: {
          max_new_tokens: 1000,
          temperature: 0.7,
          top_p: 0.9,
          top_k: 50,
          stopSequences: []
        }
      }
      
      const command = new InvokeModelCommand({
        modelId: 'us.amazon.nova-pro-v1:0',
        body: JSON.stringify(requestBody),
        contentType: 'application/json',
        accept: 'application/json'
      })
      
      const response = await client.send(command)
      const responseBody = JSON.parse(new TextDecoder().decode(response.body))
      
      return responseBody.output.message.content[0].text
      
      // Enhanced fallback responses for GSIS
      if (message.toLowerCase().includes('retirement')) {
        return `Based on GSIS regulations, retirement benefits include:

**Monthly Pension**
- Computed based on years of service and average monthly compensation
- Minimum of 15 years service required
- Formula: (Years of Service × 2.5%) × Average Monthly Compensation

**Lump Sum**
- Available for members with less than 15 years of service
- Equivalent to total contributions plus interest

**Gratuity**
- Additional benefit for qualified retirees
- One month salary for every year of service

For specific calculations, visit your nearest GSIS office or use the online calculator at gsis.gov.ph`
      }
      
      if (message.toLowerCase().includes('loan')) {
        return `GSIS offers several loan programs:

**Salary Loan**
- Up to 18 months salary, payable in 36 months
- Interest rate: 6% per annum
- Processing time: 3-5 working days

**Policy Loan**
- Against your life insurance policy
- Up to 90% of cash surrender value
- Lower interest rates

**Emergency Loan**
- For urgent financial needs
- Faster processing (1-2 days)
- Higher interest rate

**Requirements:**
- Active GSIS membership
- Updated premium contributions
- Good credit standing
- Valid government ID

Apply online at gsis.gov.ph or visit any GSIS office.`
      }
      
      if (message.toLowerCase().includes('benepisyo') || message.toLowerCase().includes('tagalog')) {
        return `Mga pangunahing benepisyo ng GSIS:

**Retirement Benefits**
- Monthly pension para sa mga miyembrong may 15+ taong serbisyo
- Lump sum para sa mga kulang sa 15 taong serbisyo

**Life Insurance**
- Basic life insurance coverage
- Optional life insurance

**Mga Loan Programs**
- Salary loan
- Policy loan
- Emergency loan

**Health Benefits**
- Medicare benefits
- Optical at dental benefits

Para sa kumpletong impormasyon, bisitahin ang gsis.gov.ph o pumunta sa pinakamalapit na GSIS office.`
      }
      
      return `Thank you for your question about "${message}". 

I'm here to help with GSIS-related inquiries including:
- Retirement and pension benefits (Mga benepisyong pagkakaretiro)
- Loan applications and requirements (Mga pautang at requirements)
- Membership and contributions (Miyembro at kontribusyon)
- Legal and policy questions (Mga legal na tanong)
- Health and insurance benefits (Kalusugan at insurance)

Please feel free to ask more specific questions in English or Tagalog, and I can provide detailed information based on GSIS regulations and policies.`
    } catch (error) {
      console.error('Chat service error:', error)
      
      // If bedrock-service is not available, use enhanced fallback responses
      return `Thank you for your question about "${message}". 

I'm here to help with GSIS-related inquiries including:
- Retirement and pension benefits (Mga benepisyong pagkakaretiro)
- Loan applications and requirements (Mga pautang at requirements)
- Membership and contributions (Miyembro at kontribusyon)
- Legal and policy questions (Mga legal na tanong)
- Health and insurance benefits (Kalusugan at insurance)

Please feel free to ask more specific questions in English or Tagalog, and I can provide detailed information based on GSIS regulations and policies.`
    }
  }
  
  return {
    sendChatMessage
  }
}