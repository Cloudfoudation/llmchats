/**
 * Test data specifically for Knowledge Base + Agent integration tests
 * Includes model configurations, KB templates, and test scenarios
 */

// Comprehensive model list for testing
export const TEST_MODELS_COMPREHENSIVE = [
  // Anthropic Models - Text and Multimodal
  {
    id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    name: 'Claude 3.5 Sonnet v2',
    provider: 'Anthropic',
    category: 'multimodal',
    tier: 'premium',
    capabilities: ['text', 'image', 'analysis', 'reasoning'],
    description: 'Latest Claude model with advanced reasoning and vision',
    testPriority: 1,
    expectedFeatures: ['kb_integration', 'image_analysis', 'complex_reasoning']
  },
  {
    id: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    category: 'multimodal',
    tier: 'premium',
    capabilities: ['text', 'image', 'analysis'],
    description: 'High-performance multimodal model',
    testPriority: 2,
    expectedFeatures: ['kb_integration', 'image_analysis']
  },
  {
    id: 'anthropic.claude-3-sonnet-20240229-v1:0',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    category: 'multimodal',
    tier: 'standard',
    capabilities: ['text', 'image', 'analysis'],
    description: 'Balanced performance and speed',
    testPriority: 3,
    expectedFeatures: ['kb_integration', 'basic_image_analysis']
  },
  {
    id: 'anthropic.claude-3-haiku-20240307-v1:0',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    category: 'text',
    tier: 'basic',
    capabilities: ['text', 'fast_response'],
    description: 'Fast and efficient model',
    testPriority: 4,
    expectedFeatures: ['kb_integration', 'fast_response']
  },
  {
    id: 'anthropic.claude-3-opus-20240229-v1:0',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    category: 'multimodal',
    tier: 'premium',
    capabilities: ['text', 'image', 'analysis', 'complex_reasoning'],
    description: 'Most capable Claude model',
    testPriority: 1,
    expectedFeatures: ['kb_integration', 'advanced_image_analysis', 'complex_reasoning']
  },

  // Amazon Titan Models
  {
    id: 'amazon.titan-text-premier-v1:0',
    name: 'Titan Text Premier',
    provider: 'Amazon',
    category: 'text',
    tier: 'premium',
    capabilities: ['text', 'long_context'],
    description: 'Amazon\'s premier text model',
    testPriority: 2,
    expectedFeatures: ['kb_integration', 'long_context']
  },
  {
    id: 'amazon.titan-text-express-v1',
    name: 'Titan Text Express',
    provider: 'Amazon',
    category: 'text',
    tier: 'standard',
    capabilities: ['text', 'fast_response'],
    description: 'Fast Amazon text model',
    testPriority: 3,
    expectedFeatures: ['kb_integration', 'fast_response']
  },
  {
    id: 'amazon.titan-text-lite-v1',
    name: 'Titan Text Lite',
    provider: 'Amazon',
    category: 'text',
    tier: 'basic',
    capabilities: ['text', 'lightweight'],
    description: 'Lightweight Amazon text model',
    testPriority: 4,
    expectedFeatures: ['basic_kb_integration']
  },

  // Meta Llama Models
  {
    id: 'meta.llama3-2-90b-instruct-v1:0',
    name: 'Llama 3.2 90B',
    provider: 'Meta',
    category: 'text',
    tier: 'premium',
    capabilities: ['text', 'large_context', 'reasoning'],
    description: 'Large Llama model with extensive capabilities',
    testPriority: 2,
    expectedFeatures: ['kb_integration', 'complex_reasoning', 'large_context']
  },
  {
    id: 'meta.llama3-2-11b-instruct-v1:0',
    name: 'Llama 3.2 11B',
    provider: 'Meta',
    category: 'multimodal',
    tier: 'standard',
    capabilities: ['text', 'image', 'reasoning'],
    description: 'Multimodal Llama model',
    testPriority: 2,
    expectedFeatures: ['kb_integration', 'image_analysis']
  },
  {
    id: 'meta.llama3-2-3b-instruct-v1:0',
    name: 'Llama 3.2 3B',
    provider: 'Meta',
    category: 'multimodal',
    tier: 'standard',
    capabilities: ['text', 'image'],
    description: 'Compact multimodal model',
    testPriority: 3,
    expectedFeatures: ['kb_integration', 'basic_image_analysis']
  },
  {
    id: 'meta.llama3-2-1b-instruct-v1:0',
    name: 'Llama 3.2 1B',
    provider: 'Meta',
    category: 'text',
    tier: 'basic',
    capabilities: ['text', 'lightweight'],
    description: 'Lightweight Llama model',
    testPriority: 4,
    expectedFeatures: ['basic_kb_integration']
  },

  // Cohere Models
  {
    id: 'cohere.command-r-plus-v1:0',
    name: 'Command R+',
    provider: 'Cohere',
    category: 'text',
    tier: 'premium',
    capabilities: ['text', 'rag', 'reasoning'],
    description: 'Advanced Cohere model with RAG capabilities',
    testPriority: 2,
    expectedFeatures: ['kb_integration', 'rag_optimization', 'reasoning']
  },
  {
    id: 'cohere.command-r-v1:0',
    name: 'Command R',
    provider: 'Cohere',
    category: 'text',
    tier: 'standard',
    capabilities: ['text', 'rag'],
    description: 'Cohere model optimized for RAG',
    testPriority: 3,
    expectedFeatures: ['kb_integration', 'rag_optimization']
  }
];

// Knowledge Base templates for different test scenarios
export const KB_TEMPLATES = {
  technical: {
    name: () => `TechKB_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    description: 'Technical documentation and API references',
    content: `
# Technical Documentation Knowledge Base

## API Documentation
This section contains comprehensive API documentation including:
- REST API endpoints and methods
- Authentication and authorization
- Request/response formats
- Error handling and status codes

## Software Development Best Practices
- Code review guidelines
- Testing strategies
- Deployment procedures
- Security considerations

## Architecture Patterns
- Microservices architecture
- Event-driven design
- Database design patterns
- Caching strategies

## Troubleshooting Guide
Common issues and their solutions for development and production environments.
    `,
    testQuestions: [
      'What API documentation do you have access to?',
      'Can you help me with software development best practices?',
      'What architecture patterns are covered in your knowledge base?',
      'How can you assist with troubleshooting technical issues?'
    ],
    expectedKeywords: ['API', 'documentation', 'development', 'architecture', 'troubleshooting']
  },

  business: {
    name: () => `BusinessKB_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    description: 'Business processes, policies, and procedures',
    content: `
# Business Knowledge Base

## Company Policies
- Employee handbook
- Code of conduct
- Privacy policy
- Data protection guidelines

## Business Processes
- Customer onboarding
- Order fulfillment
- Support ticket handling
- Performance review process

## Financial Procedures
- Expense reporting
- Budget approval process
- Invoice processing
- Financial reporting

## HR Information
- Benefits information
- Leave policies
- Training programs
- Career development paths
    `,
    testQuestions: [
      'What company policies can you help me understand?',
      'Can you explain our business processes?',
      'What financial procedures should I follow?',
      'What HR information do you have available?'
    ],
    expectedKeywords: ['policy', 'process', 'procedure', 'business', 'company']
  },

  product: {
    name: () => `ProductKB_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    description: 'Product information, features, and user guides',
    content: `
# Product Knowledge Base

## Product Features
- Core functionality overview
- Advanced features and capabilities
- Integration options
- Customization possibilities

## User Guides
- Getting started guide
- Step-by-step tutorials
- Configuration instructions
- Best practices for usage

## FAQ
- Common questions and answers
- Troubleshooting tips
- Feature explanations
- Usage scenarios

## Release Notes
- Latest updates and improvements
- Bug fixes and patches
- New feature announcements
- Deprecation notices
    `,
    testQuestions: [
      'What product features can you tell me about?',
      'Can you help me with user guides and tutorials?',
      'What frequently asked questions do you have?',
      'What are the latest product updates?'
    ],
    expectedKeywords: ['product', 'features', 'guide', 'tutorial', 'FAQ']
  },

  legal: {
    name: () => `LegalKB_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    description: 'Legal documents, compliance, and regulatory information',
    content: `
# Legal and Compliance Knowledge Base

## Legal Documents
- Terms of service
- Privacy policy
- Data processing agreements
- Service level agreements

## Compliance Requirements
- GDPR compliance guidelines
- Industry-specific regulations
- Security standards
- Audit requirements

## Contract Templates
- Service agreements
- Non-disclosure agreements
- Employment contracts
- Vendor agreements

## Regulatory Updates
- Recent legal changes
- Compliance deadlines
- Industry notifications
- Best practice updates
    `,
    testQuestions: [
      'What legal documents do you have information about?',
      'Can you help with compliance requirements?',
      'What contract templates are available?',
      'Are there any recent regulatory updates?'
    ],
    expectedKeywords: ['legal', 'compliance', 'regulation', 'contract', 'policy']
  },

  multimodal: {
    name: () => `MultiKB_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    description: 'Mixed content with text, images, and documents',
    content: `
# Multimodal Knowledge Base

## Visual Content Analysis
This knowledge base contains information about:
- Image recognition and analysis
- Document processing and OCR
- Visual data interpretation
- Multimedia content handling

## Text and Image Integration
- Combined text and visual information
- Image descriptions and annotations
- Visual documentation
- Infographic content

## Document Types
- PDFs with embedded images
- Presentations with visual elements
- Technical diagrams and charts
- Screenshots and UI mockups
    `,
    testQuestions: [
      'Can you analyze images and visual content?',
      'How do you handle documents with both text and images?',
      'What visual analysis capabilities do you have?',
      'Can you process multimedia content?'
    ],
    expectedKeywords: ['image', 'visual', 'document', 'analysis', 'multimedia'],
    hasImages: true
  }
};

// Test scenarios for different model + KB combinations
export const TEST_SCENARIOS = {
  basic_integration: {
    name: 'Basic KB Integration',
    description: 'Test basic knowledge base integration with simple Q&A',
    steps: [
      'Create knowledge base with text content',
      'Create agent with selected model',
      'Assign KB to agent',
      'Test simple question about KB content',
      'Verify agent can access and use KB information'
    ],
    expectedOutcome: 'Agent responds with information from KB',
    timeoutMs: 30000
  },

  complex_reasoning: {
    name: 'Complex Reasoning with KB',
    description: 'Test complex reasoning capabilities using KB information',
    steps: [
      'Create comprehensive knowledge base',
      'Create agent with reasoning-capable model',
      'Ask complex questions requiring synthesis',
      'Test multi-step reasoning with KB data',
      'Verify logical connections and inferences'
    ],
    expectedOutcome: 'Agent demonstrates reasoning using KB information',
    timeoutMs: 60000
  },

  multimodal_analysis: {
    name: 'Multimodal KB Analysis',
    description: 'Test multimodal capabilities with mixed content KB',
    steps: [
      'Create KB with text and image content',
      'Create agent with multimodal model',
      'Test text-only questions',
      'Test image analysis questions',
      'Test combined text+image questions'
    ],
    expectedOutcome: 'Agent handles both text and visual content',
    timeoutMs: 45000
  },

  performance_test: {
    name: 'Performance and Speed Test',
    description: 'Test response speed and efficiency with KB',
    steps: [
      'Create large knowledge base',
      'Create agent with fast model',
      'Measure response times',
      'Test concurrent requests',
      'Verify accuracy maintained at speed'
    ],
    expectedOutcome: 'Fast responses without accuracy loss',
    timeoutMs: 20000
  },

  stress_test: {
    name: 'Stress Test with Large KB',
    description: 'Test handling of large knowledge bases',
    steps: [
      'Create very large knowledge base',
      'Create agent with high-capacity model',
      'Test complex queries across large dataset',
      'Test memory and context handling',
      'Verify consistent performance'
    ],
    expectedOutcome: 'Stable performance with large KB',
    timeoutMs: 90000
  }
};

// Model-specific test configurations
export const MODEL_TEST_CONFIGS = {
  'anthropic.claude-3-5-sonnet-20241022-v2:0': {
    scenarios: ['basic_integration', 'complex_reasoning', 'multimodal_analysis'],
    kbTypes: ['technical', 'business', 'multimodal'],
    expectedCapabilities: ['advanced_reasoning', 'image_analysis', 'long_context'],
    timeoutMultiplier: 1.2
  },
  'anthropic.claude-3-haiku-20240307-v1:0': {
    scenarios: ['basic_integration', 'performance_test'],
    kbTypes: ['technical', 'product'],
    expectedCapabilities: ['fast_response', 'basic_reasoning'],
    timeoutMultiplier: 0.8
  },
  'meta.llama3-2-90b-instruct-v1:0': {
    scenarios: ['basic_integration', 'complex_reasoning', 'stress_test'],
    kbTypes: ['technical', 'business', 'legal'],
    expectedCapabilities: ['large_context', 'reasoning', 'comprehensive_analysis'],
    timeoutMultiplier: 1.5
  },
  'amazon.titan-text-premier-v1:0': {
    scenarios: ['basic_integration', 'complex_reasoning'],
    kbTypes: ['business', 'legal'],
    expectedCapabilities: ['long_context', 'structured_output'],
    timeoutMultiplier: 1.0
  }
};

// Success criteria for different test types
export const SUCCESS_CRITERIA = {
  response_received: {
    description: 'Agent provides any response',
    weight: 1,
    required: true
  },
  kb_content_referenced: {
    description: 'Response references KB content',
    weight: 3,
    required: true
  },
  accurate_information: {
    description: 'Response contains accurate information',
    weight: 4,
    required: true
  },
  contextual_understanding: {
    description: 'Response shows understanding of context',
    weight: 3,
    required: false
  },
  reasoning_demonstrated: {
    description: 'Response shows logical reasoning',
    weight: 2,
    required: false
  },
  multimodal_capability: {
    description: 'Handles both text and visual content',
    weight: 2,
    required: false // Only for multimodal models
  },
  performance_acceptable: {
    description: 'Response time within acceptable limits',
    weight: 1,
    required: false
  }
};

// Helper functions for test data generation
export const generateTestData = {
  uniqueKbName: (prefix: string = 'TestKB') => 
    `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
  
  uniqueAgentName: (modelProvider: string = 'Test') => 
    `Agent_${modelProvider}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  
  testContent: (type: string) => {
    const baseContent = KB_TEMPLATES[type as keyof typeof KB_TEMPLATES];
    return baseContent ? baseContent.content : KB_TEMPLATES.technical.content;
  },
  
  testQuestions: (type: string) => {
    const baseContent = KB_TEMPLATES[type as keyof typeof KB_TEMPLATES];
    return baseContent ? baseContent.testQuestions : KB_TEMPLATES.technical.testQuestions;
  }
};

// Export commonly used model subsets
export const PRIORITY_MODELS = TEST_MODELS_COMPREHENSIVE.filter(m => m.testPriority <= 2);
export const MULTIMODAL_MODELS = TEST_MODELS_COMPREHENSIVE.filter(m => m.category === 'multimodal');
export const TEXT_ONLY_MODELS = TEST_MODELS_COMPREHENSIVE.filter(m => m.category === 'text');
export const FAST_MODELS = TEST_MODELS_COMPREHENSIVE.filter(m => m.capabilities.includes('fast_response'));
export const REASONING_MODELS = TEST_MODELS_COMPREHENSIVE.filter(m => m.capabilities.includes('reasoning'));
