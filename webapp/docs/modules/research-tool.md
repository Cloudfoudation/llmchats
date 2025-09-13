# Research Tool Module

## Purpose
Deep research functionality that leverages AI to conduct comprehensive research on topics, generate detailed reports, and provide structured analysis.

## API Integration

### Bedrock Service API
- **Base URL**: Bedrock service backend (separate from main APIs)
- **Models**: Specialized research models with extended context
- **Processing**: Multi-step research workflow

### Research Endpoints
```typescript
POST   /research/start                 // Start research session
GET    /research/{sessionId}           // Get research status
POST   /research/{sessionId}/query     // Add research query
GET    /research/{sessionId}/results   // Get research results
DELETE /research/{sessionId}           // Cancel research session
```

## Key Components

### 1. Research Layout (`src/components/research/Layout.tsx`)
```typescript
// Main research interface
- Research query input
- Progress tracking
- Results display
- Export functionality
```

### 2. Research Index (`src/components/research/index.tsx`)
```typescript
// Research orchestration
- Session management
- Query processing
- Result compilation
- Status monitoring
```

### 3. Article Modal (`src/components/research/ArticleModal.tsx`)
```typescript
// Research result display
- Detailed article view
- Source citations
- Export options
- Sharing functionality
```

## Implementation

### Research Hook (`src/hooks/useResearch.ts`)
```typescript
export const useResearch = () => {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [activeSession, setActiveSession] = useState<ResearchSession | null>(null);
  const [loading, setLoading] = useState(false);

  // Start new research session
  const startResearch = async (query: string, options?: ResearchOptions) => {
    setLoading(true);
    try {
      const response = await researchService.startResearch({
        query,
        depth: options?.depth || 'comprehensive',
        sources: options?.sources || ['web', 'academic', 'news'],
        language: options?.language || 'en',
        maxSources: options?.maxSources || 20
      });

      if (response.success) {
        const session = response.data.session;
        setSessions(prev => [session, ...prev]);
        setActiveSession(session);
        
        // Start monitoring progress
        monitorResearchProgress(session.id);
        return session;
      }
      
      throw new Error(response.error?.message || 'Failed to start research');
    } catch (error) {
      console.error('Error starting research:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Monitor research progress
  const monitorResearchProgress = async (sessionId: string) => {
    const checkProgress = async () => {
      try {
        const response = await researchService.getResearchStatus(sessionId);
        if (response.success) {
          const updatedSession = response.data.session;
          
          // Update session in state
          setSessions(prev => prev.map(session => 
            session.id === sessionId ? updatedSession : session
          ));
          
          if (activeSession?.id === sessionId) {
            setActiveSession(updatedSession);
          }
          
          // Continue monitoring if still in progress
          if (updatedSession.status === 'in_progress') {
            setTimeout(checkProgress, 2000); // Check every 2 seconds
          }
        }
      } catch (error) {
        console.error('Error checking research progress:', error);
      }
    };

    checkProgress();
  };

  // Get research results
  const getResearchResults = async (sessionId: string) => {
    try {
      const response = await researchService.getResearchResults(sessionId);
      if (response.success) {
        return response.data.results;
      }
      throw new Error(response.error?.message || 'Failed to get research results');
    } catch (error) {
      console.error('Error getting research results:', error);
      throw error;
    }
  };

  // Add follow-up query to existing session
  const addResearchQuery = async (sessionId: string, query: string) => {
    try {
      const response = await researchService.addResearchQuery(sessionId, { query });
      if (response.success) {
        // Restart monitoring for updated session
        monitorResearchProgress(sessionId);
        return response.data.session;
      }
      throw new Error(response.error?.message || 'Failed to add research query');
    } catch (error) {
      console.error('Error adding research query:', error);
      throw error;
    }
  };

  // Cancel research session
  const cancelResearch = async (sessionId: string) => {
    try {
      const response = await researchService.cancelResearch(sessionId);
      if (response.success) {
        setSessions(prev => prev.map(session => 
          session.id === sessionId 
            ? { ...session, status: 'cancelled' }
            : session
        ));
        
        if (activeSession?.id === sessionId) {
          setActiveSession(prev => prev ? { ...prev, status: 'cancelled' } : null);
        }
        
        return true;
      }
      throw new Error(response.error?.message || 'Failed to cancel research');
    } catch (error) {
      console.error('Error cancelling research:', error);
      throw error;
    }
  };

  return {
    sessions,
    activeSession,
    loading,
    startResearch,
    getResearchResults,
    addResearchQuery,
    cancelResearch,
    setActiveSession
  };
};
```

### Research Service (`src/services/research.ts`)
```typescript
class ResearchService {
  private baseUrl = process.env.NEXT_PUBLIC_BEDROCK_SERVICE_URL;

  // Start comprehensive research
  async startResearch(request: StartResearchRequest): Promise<StartResearchResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.post('/research/start', request, { headers });
    return response.data;
  }

  // Get research session status
  async getResearchStatus(sessionId: string): Promise<GetResearchStatusResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.get(`/research/${sessionId}`, { headers });
    return response.data;
  }

  // Get compiled research results
  async getResearchResults(sessionId: string): Promise<GetResearchResultsResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.get(`/research/${sessionId}/results`, { headers });
    return response.data;
  }

  // Add follow-up query to research session
  async addResearchQuery(sessionId: string, request: AddQueryRequest): Promise<AddQueryResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.post(
      `/research/${sessionId}/query`,
      request,
      { headers }
    );
    return response.data;
  }

  // Cancel research session
  async cancelResearch(sessionId: string): Promise<CancelResearchResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.delete(`/research/${sessionId}`, { headers });
    return response.data;
  }

  // Export research results
  async exportResearch(sessionId: string, format: 'pdf' | 'docx' | 'md'): Promise<Blob> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.get(
      `/research/${sessionId}/export`,
      { 
        headers,
        params: { format },
        responseType: 'blob'
      }
    );
    return response.data;
  }
}
```

## Data Structures

### Research Session
```typescript
interface ResearchSession {
  id: string;
  query: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress: {
    currentStep: string;
    completedSteps: string[];
    totalSteps: number;
    percentage: number;
  };
  options: ResearchOptions;
  results?: ResearchResults;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
}

interface ResearchOptions {
  depth: 'basic' | 'comprehensive' | 'expert';
  sources: ('web' | 'academic' | 'news' | 'books')[];
  language: string;
  maxSources: number;
  includeImages: boolean;
  includeCitations: boolean;
  outputFormat: 'article' | 'report' | 'summary';
}

interface ResearchResults {
  title: string;
  summary: string;
  sections: ResearchSection[];
  sources: ResearchSource[];
  keyFindings: string[];
  recommendations: string[];
  metadata: {
    wordCount: number;
    sourceCount: number;
    researchTime: number;
    confidence: number;
  };
}

interface ResearchSection {
  id: string;
  title: string;
  content: string;
  subsections?: ResearchSection[];
  sources: string[]; // Source IDs
  confidence: number;
}

interface ResearchSource {
  id: string;
  title: string;
  url?: string;
  author?: string;
  publishedDate?: string;
  type: 'web' | 'academic' | 'news' | 'book';
  relevance: number;
  credibility: number;
  excerpt: string;
}
```

## Research Workflow

### 1. Multi-Step Research Process
```typescript
const RESEARCH_STEPS = [
  'query_analysis',      // Analyze and expand the research query
  'source_discovery',    // Find relevant sources
  'content_extraction',  // Extract content from sources
  'fact_verification',   // Verify facts and cross-reference
  'synthesis',          // Synthesize information
  'structure_creation', // Create structured output
  'citation_generation', // Generate proper citations
  'quality_review'      // Final quality check
];

// Research step execution
const executeResearchStep = async (sessionId: string, step: string, data: any) => {
  switch (step) {
    case 'query_analysis':
      return await analyzeQuery(data.query);
    
    case 'source_discovery':
      return await discoverSources(data.expandedQuery, data.options);
    
    case 'content_extraction':
      return await extractContent(data.sources);
    
    case 'fact_verification':
      return await verifyFacts(data.content);
    
    case 'synthesis':
      return await synthesizeInformation(data.verifiedContent);
    
    case 'structure_creation':
      return await createStructure(data.synthesizedContent);
    
    case 'citation_generation':
      return await generateCitations(data.structuredContent, data.sources);
    
    case 'quality_review':
      return await reviewQuality(data.finalContent);
    
    default:
      throw new Error(`Unknown research step: ${step}`);
  }
};
```

### 2. Source Discovery and Validation
```typescript
// Discover sources from multiple channels
const discoverSources = async (query: string, options: ResearchOptions) => {
  const sources: ResearchSource[] = [];
  
  // Web search
  if (options.sources.includes('web')) {
    const webSources = await searchWeb(query, options.maxSources / 4);
    sources.push(...webSources);
  }
  
  // Academic search
  if (options.sources.includes('academic')) {
    const academicSources = await searchAcademic(query, options.maxSources / 4);
    sources.push(...academicSources);
  }
  
  // News search
  if (options.sources.includes('news')) {
    const newsSources = await searchNews(query, options.maxSources / 4);
    sources.push(...newsSources);
  }
  
  // Validate and score sources
  const validatedSources = await Promise.all(
    sources.map(async source => ({
      ...source,
      credibility: await assessCredibility(source),
      relevance: await assessRelevance(source, query)
    }))
  );
  
  // Sort by combined score and return top sources
  return validatedSources
    .sort((a, b) => (b.credibility + b.relevance) - (a.credibility + a.relevance))
    .slice(0, options.maxSources);
};
```

### 3. Content Synthesis
```typescript
// Synthesize information from multiple sources
const synthesizeInformation = async (content: ExtractedContent[]) => {
  const synthesis = {
    keyPoints: [],
    conflictingInfo: [],
    consensus: [],
    gaps: []
  };
  
  // Group content by topic
  const topicGroups = groupContentByTopic(content);
  
  // For each topic, find consensus and conflicts
  for (const [topic, topicContent] of Object.entries(topicGroups)) {
    const analysis = await analyzeTopicContent(topicContent);
    
    synthesis.keyPoints.push(...analysis.keyPoints);
    synthesis.conflictingInfo.push(...analysis.conflicts);
    synthesis.consensus.push(...analysis.consensus);
    synthesis.gaps.push(...analysis.gaps);
  }
  
  return synthesis;
};
```

## User Flow

### 1. Start Research
1. User navigates to Research Tool
2. Enters research query/topic
3. Configures research options:
   - Research depth (basic/comprehensive/expert)
   - Source types (web/academic/news/books)
   - Language preference
   - Maximum sources
4. Clicks "Start Research"
5. Research session begins

### 2. Monitor Progress
1. Real-time progress bar shows completion
2. Current step displayed (e.g., "Discovering sources...")
3. Estimated time remaining
4. Option to cancel research
5. Notifications when major steps complete

### 3. Review Results
1. Research completes with structured report
2. Sections include:
   - Executive summary
   - Key findings
   - Detailed analysis
   - Recommendations
   - Source citations
3. Interactive navigation between sections
4. Source verification and credibility scores

### 4. Export and Share
1. Export options: PDF, DOCX, Markdown
2. Share research with groups
3. Save to knowledge base
4. Generate follow-up research queries

## Features

### 1. Intelligent Query Expansion
```typescript
// Expand research query with related topics
const expandQuery = async (originalQuery: string) => {
  const expansion = await bedrockService.invoke({
    model: 'anthropic.claude-3-sonnet-20240229-v1:0',
    messages: [{
      role: 'user',
      content: `Expand this research query with related topics, subtopics, and key questions to investigate: "${originalQuery}"`
    }]
  });
  
  return {
    originalQuery,
    expandedTopics: expansion.topics,
    keyQuestions: expansion.questions,
    relatedTerms: expansion.terms
  };
};
```

### 2. Source Credibility Assessment
```typescript
// Assess source credibility using multiple factors
const assessCredibility = async (source: ResearchSource) => {
  let score = 0;
  
  // Domain authority
  const domainScore = await getDomainAuthority(source.url);
  score += domainScore * 0.3;
  
  // Author credentials
  if (source.author) {
    const authorScore = await assessAuthorCredibility(source.author);
    score += authorScore * 0.2;
  }
  
  // Publication date recency
  if (source.publishedDate) {
    const recencyScore = calculateRecencyScore(source.publishedDate);
    score += recencyScore * 0.2;
  }
  
  // Content quality indicators
  const contentScore = await assessContentQuality(source.excerpt);
  score += contentScore * 0.3;
  
  return Math.min(score, 1.0); // Cap at 1.0
};
```

### 3. Fact Verification
```typescript
// Cross-reference facts across sources
const verifyFacts = async (extractedContent: ExtractedContent[]) => {
  const facts = extractFactualClaims(extractedContent);
  const verifiedFacts = [];
  
  for (const fact of facts) {
    const verification = {
      claim: fact.claim,
      sources: fact.sources,
      confidence: 0,
      conflicting: false,
      consensus: false
    };
    
    // Count supporting sources
    const supportingSources = fact.sources.filter(source => 
      source.supports === true
    );
    
    // Calculate confidence based on source count and credibility
    verification.confidence = calculateFactConfidence(
      supportingSources,
      fact.sources.length
    );
    
    // Check for conflicts
    const conflictingSources = fact.sources.filter(source => 
      source.supports === false
    );
    
    verification.conflicting = conflictingSources.length > 0;
    verification.consensus = supportingSources.length > conflictingSources.length;
    
    verifiedFacts.push(verification);
  }
  
  return verifiedFacts;
};
```

### 4. Structured Output Generation
```typescript
// Generate structured research report
const generateStructuredReport = async (synthesizedData: any) => {
  const report: ResearchResults = {
    title: await generateTitle(synthesizedData.query),
    summary: await generateExecutiveSummary(synthesizedData),
    sections: [],
    sources: synthesizedData.sources,
    keyFindings: synthesizedData.keyFindings,
    recommendations: await generateRecommendations(synthesizedData),
    metadata: {
      wordCount: 0,
      sourceCount: synthesizedData.sources.length,
      researchTime: synthesizedData.researchTime,
      confidence: calculateOverallConfidence(synthesizedData)
    }
  };
  
  // Generate sections based on content themes
  const themes = identifyContentThemes(synthesizedData.content);
  
  for (const theme of themes) {
    const section = await generateSection(theme, synthesizedData);
    report.sections.push(section);
  }
  
  // Calculate total word count
  report.metadata.wordCount = calculateWordCount(report);
  
  return report;
};
```

## Error Handling

### Common Errors
- `ResearchTimeout`: Research took too long to complete
- `InsufficientSources`: Not enough reliable sources found
- `ContentExtractionFailed`: Unable to extract content from sources
- `SynthesisError`: Error during information synthesis
- `ExportFailed`: Error generating export file

### Error Recovery
```typescript
const handleResearchError = async (sessionId: string, error: any, step: string) => {
  console.error(`Research error in step ${step}:`, error);
  
  // Update session with error status
  await updateResearchSession(sessionId, {
    status: 'failed',
    error: error.message,
    failedStep: step
  });
  
  // Attempt recovery based on error type
  switch (error.code) {
    case 'INSUFFICIENT_SOURCES':
      // Retry with broader search terms
      return await retryWithBroaderSearch(sessionId);
      
    case 'CONTENT_EXTRACTION_FAILED':
      // Skip problematic sources and continue
      return await continueWithAvailableSources(sessionId);
      
    case 'SYNTHESIS_ERROR':
      // Use simpler synthesis approach
      return await useBasicSynthesis(sessionId);
      
    default:
      throw error;
  }
};
```

## Usage Examples

### Start Research
```typescript
const { startResearch } = useResearch();

const handleStartResearch = async () => {
  try {
    const session = await startResearch(
      'Impact of artificial intelligence on healthcare',
      {
        depth: 'comprehensive',
        sources: ['web', 'academic', 'news'],
        language: 'en',
        maxSources: 25,
        includeImages: true,
        includeCitations: true,
        outputFormat: 'report'
      }
    );
    
    console.log('Research started:', session.id);
  } catch (error) {
    console.error('Failed to start research:', error);
  }
};
```

### Monitor Progress
```typescript
const { activeSession } = useResearch();

const ResearchProgress = () => {
  if (!activeSession || activeSession.status !== 'in_progress') {
    return null;
  }

  return (
    <div className="research-progress">
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${activeSession.progress.percentage}%` }}
        />
      </div>
      <p>Step {activeSession.progress.completedSteps.length + 1} of {activeSession.progress.totalSteps}</p>
      <p>{activeSession.progress.currentStep}</p>
    </div>
  );
};
```

### Export Results
```typescript
const exportResearch = async (sessionId: string, format: 'pdf' | 'docx' | 'md') => {
  try {
    const blob = await researchService.exportResearch(sessionId, format);
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `research-${sessionId}.${format}`;
    link.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
  }
};
```