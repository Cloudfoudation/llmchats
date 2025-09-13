# Event Composer Module

## Purpose
AI-powered event planning assistant that helps create comprehensive event plans, schedules, and logistics using specialized event planning agents.

## API Integration

### Bedrock Service API
- **Base URL**: Bedrock service backend
- **Agent**: Event Composer Agent
- **Models**: Specialized event planning models

### Event Composer Endpoints
```typescript
POST   /event-composer/create          // Create new event plan
GET    /event-composer/{eventId}       // Get event details
PUT    /event-composer/{eventId}       // Update event plan
DELETE /event-composer/{eventId}       // Delete event plan
POST   /event-composer/{eventId}/generate // Generate event components
GET    /event-composer/templates       // Get event templates
```

## Key Components

### 1. Event Composer Layout (`src/components/event-composer/Layout.tsx`)
```typescript
// Main event planning interface
- Event creation wizard
- Timeline management
- Budget tracking
- Vendor coordination
- Guest management
```

### 2. Event Composer Index (`src/components/event-composer/index.tsx`)
```typescript
// Event orchestration
- Event type selection
- Requirements gathering
- Plan generation
- Iterative refinement
```

### 3. Event Modal (`src/components/event-composer/EventModal.tsx`)
```typescript
// Event details management
- Event information form
- Schedule editor
- Budget planner
- Checklist manager
```

## Implementation

### Event Composer Service (`src/services/event.ts`)
```typescript
class EventComposerService {
  private baseUrl = process.env.NEXT_PUBLIC_BEDROCK_SERVICE_URL;

  // Create new event plan
  async createEvent(eventData: CreateEventRequest): Promise<CreateEventResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.post('/event-composer/create', eventData, { headers });
    return response.data;
  }

  // Get event details
  async getEvent(eventId: string): Promise<GetEventResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.get(`/event-composer/${eventId}`, { headers });
    return response.data;
  }

  // Update event plan
  async updateEvent(eventId: string, eventData: UpdateEventRequest): Promise<UpdateEventResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.put(`/event-composer/${eventId}`, eventData, { headers });
    return response.data;
  }

  // Generate event components using AI
  async generateEventComponents(eventId: string, request: GenerateComponentsRequest): Promise<GenerateComponentsResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.post(
      `/event-composer/${eventId}/generate`,
      request,
      { headers }
    );
    return response.data;
  }

  // Get event templates
  async getEventTemplates(eventType?: string): Promise<GetTemplatesResponse> {
    const headers = await this.getHeaders();
    const params = eventType ? { type: eventType } : {};
    const response = await this.axiosInstance.get('/event-composer/templates', { 
      headers,
      params
    });
    return response.data;
  }

  // Generate event timeline
  async generateTimeline(eventData: EventPlanningData): Promise<EventTimeline> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.post('/event-composer/timeline', eventData, { headers });
    return response.data.timeline;
  }

  // Generate budget estimate
  async generateBudget(eventData: EventPlanningData): Promise<EventBudget> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.post('/event-composer/budget', eventData, { headers });
    return response.data.budget;
  }

  // Generate vendor recommendations
  async generateVendorRecommendations(eventData: EventPlanningData): Promise<VendorRecommendation[]> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.post('/event-composer/vendors', eventData, { headers });
    return response.data.vendors;
  }
}
```

### Event Hook (`src/hooks/useEvent.ts`)
```typescript
export const useEvent = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Create new event
  const createEvent = async (eventData: CreateEventRequest) => {
    setLoading(true);
    try {
      const response = await eventComposerService.createEvent(eventData);
      if (response.success) {
        const newEvent = response.data.event;
        setEvents(prev => [newEvent, ...prev]);
        setActiveEvent(newEvent);
        return newEvent;
      }
      throw new Error(response.error?.message || 'Failed to create event');
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Generate event plan using AI
  const generateEventPlan = async (eventId: string, requirements: EventRequirements) => {
    setLoading(true);
    try {
      // Generate all components in parallel
      const [timeline, budget, vendors] = await Promise.all([
        eventComposerService.generateTimeline(requirements),
        eventComposerService.generateBudget(requirements),
        eventComposerService.generateVendorRecommendations(requirements)
      ]);

      // Update event with generated components
      const updatedEvent = await eventComposerService.updateEvent(eventId, {
        timeline,
        budget,
        vendors,
        status: 'planned'
      });

      if (updatedEvent.success) {
        setEvents(prev => prev.map(event => 
          event.id === eventId ? updatedEvent.data.event : event
        ));
        
        if (activeEvent?.id === eventId) {
          setActiveEvent(updatedEvent.data.event);
        }
        
        return updatedEvent.data.event;
      }
      
      throw new Error(updatedEvent.error?.message || 'Failed to generate event plan');
    } catch (error) {
      console.error('Error generating event plan:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Load event templates
  const loadTemplates = async (eventType?: string) => {
    try {
      const response = await eventComposerService.getEventTemplates(eventType);
      if (response.success) {
        setTemplates(response.data.templates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  // Update event
  const updateEvent = async (eventId: string, eventData: UpdateEventRequest) => {
    try {
      const response = await eventComposerService.updateEvent(eventId, eventData);
      if (response.success) {
        const updatedEvent = response.data.event;
        setEvents(prev => prev.map(event => 
          event.id === eventId ? updatedEvent : event
        ));
        
        if (activeEvent?.id === eventId) {
          setActiveEvent(updatedEvent);
        }
        
        return updatedEvent;
      }
      throw new Error(response.error?.message || 'Failed to update event');
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  };

  return {
    events,
    activeEvent,
    templates,
    loading,
    createEvent,
    generateEventPlan,
    loadTemplates,
    updateEvent,
    setActiveEvent
  };
};
```

## Data Structures

### Event Objects
```typescript
interface Event {
  id: string;
  name: string;
  description?: string;
  type: EventType;
  status: 'draft' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;
  location?: EventLocation;
  attendeeCount: number;
  budget?: EventBudget;
  timeline?: EventTimeline;
  vendors?: VendorRecommendation[];
  checklist?: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface EventType {
  id: string;
  name: string;
  category: 'corporate' | 'social' | 'educational' | 'entertainment' | 'wedding' | 'conference';
  description: string;
  defaultDuration: number; // hours
  typicalAttendeeRange: [number, number];
  commonVenues: string[];
  requiredServices: string[];
}

interface EventLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  capacity: number;
  amenities: string[];
  accessibility: boolean;
  parking: boolean;
  catering: boolean;
}

interface EventRequirements {
  eventType: string;
  attendeeCount: number;
  budget: number;
  startDate: string;
  endDate: string;
  location?: EventLocation;
  preferences: {
    style: string;
    theme?: string;
    dietary: string[];
    accessibility: boolean;
    sustainability: boolean;
  };
  services: string[];
  specialRequests?: string;
}
```

### Event Planning Components
```typescript
interface EventTimeline {
  phases: EventPhase[];
  milestones: Milestone[];
  criticalPath: string[];
  totalDuration: number; // days
}

interface EventPhase {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  tasks: Task[];
  dependencies: string[];
  responsible: string;
}

interface Task {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assignee?: string;
  estimatedHours: number;
  dependencies: string[];
}

interface EventBudget {
  totalBudget: number;
  categories: BudgetCategory[];
  contingency: number;
  actualSpent: number;
  remaining: number;
}

interface BudgetCategory {
  id: string;
  name: string;
  allocatedAmount: number;
  estimatedCost: number;
  actualCost: number;
  items: BudgetItem[];
}

interface BudgetItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  vendor?: string;
  status: 'estimated' | 'quoted' | 'contracted' | 'paid';
}

interface VendorRecommendation {
  id: string;
  name: string;
  category: string;
  services: string[];
  rating: number;
  priceRange: 'low' | 'medium' | 'high';
  location: string;
  contact: {
    email: string;
    phone: string;
    website?: string;
  };
  portfolio: string[];
  reviews: VendorReview[];
  availability: boolean;
}
```

## Event Planning Workflow

### 1. Event Creation Wizard
```typescript
const EventCreationWizard = () => {
  const [step, setStep] = useState(1);
  const [eventData, setEventData] = useState<Partial<CreateEventRequest>>({});

  const steps = [
    { id: 1, name: 'Basic Info', component: BasicInfoStep },
    { id: 2, name: 'Event Type', component: EventTypeStep },
    { id: 3, name: 'Requirements', component: RequirementsStep },
    { id: 4, name: 'Preferences', component: PreferencesStep },
    { id: 5, name: 'Review', component: ReviewStep }
  ];

  const handleNext = () => {
    if (step < steps.length) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    try {
      const event = await createEvent(eventData as CreateEventRequest);
      // Redirect to event planning page
      router.push(`/event-composer/${event.id}`);
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const CurrentStepComponent = steps[step - 1].component;

  return (
    <div className="event-wizard">
      <div className="wizard-progress">
        {steps.map((s, index) => (
          <div 
            key={s.id}
            className={`step ${index + 1 <= step ? 'completed' : ''}`}
          >
            {s.name}
          </div>
        ))}
      </div>

      <CurrentStepComponent
        data={eventData}
        onChange={setEventData}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onComplete={handleComplete}
      />
    </div>
  );
};
```

### 2. AI-Powered Plan Generation
```typescript
// Generate comprehensive event plan
const generateComprehensivePlan = async (requirements: EventRequirements) => {
  const planningPrompt = `
    Create a comprehensive event plan for:
    - Event Type: ${requirements.eventType}
    - Attendees: ${requirements.attendeeCount}
    - Budget: $${requirements.budget}
    - Date: ${requirements.startDate} to ${requirements.endDate}
    - Location: ${requirements.location?.name || 'TBD'}
    
    Include:
    1. Detailed timeline with phases and tasks
    2. Budget breakdown by category
    3. Vendor recommendations
    4. Risk assessment and contingencies
    5. Success metrics and KPIs
  `;

  const response = await bedrockService.invoke({
    model: 'anthropic.claude-3-sonnet-20240229-v1:0',
    messages: [{
      role: 'user',
      content: planningPrompt
    }],
    temperature: 0.7,
    maxTokens: 4000
  });

  return parseEventPlan(response.content);
};

// Parse AI response into structured event plan
const parseEventPlan = (aiResponse: string): EventPlan => {
  // Use structured parsing to extract:
  // - Timeline phases and tasks
  // - Budget categories and items
  // - Vendor recommendations
  // - Risk factors and mitigation strategies
  
  return {
    timeline: extractTimeline(aiResponse),
    budget: extractBudget(aiResponse),
    vendors: extractVendorRecommendations(aiResponse),
    risks: extractRiskAssessment(aiResponse),
    metrics: extractSuccessMetrics(aiResponse)
  };
};
```

### 3. Dynamic Timeline Management
```typescript
// Generate dynamic timeline based on event complexity
const generateDynamicTimeline = (eventData: EventRequirements): EventTimeline => {
  const basePhases = getBasePhases(eventData.eventType);
  const customPhases = [];

  // Add phases based on event requirements
  if (eventData.attendeeCount > 100) {
    customPhases.push(createPhase('Large Event Logistics'));
  }

  if (eventData.preferences.catering) {
    customPhases.push(createPhase('Catering Coordination'));
  }

  if (eventData.preferences.entertainment) {
    customPhases.push(createPhase('Entertainment Booking'));
  }

  // Calculate dependencies and critical path
  const allPhases = [...basePhases, ...customPhases];
  const timeline = calculateTimeline(allPhases, eventData.startDate);
  
  return {
    phases: timeline.phases,
    milestones: timeline.milestones,
    criticalPath: calculateCriticalPath(timeline.phases),
    totalDuration: calculateTotalDuration(timeline.phases)
  };
};
```

## User Flow

### 1. Create Event
1. User clicks "Create New Event"
2. Event creation wizard opens
3. User fills in basic information:
   - Event name and description
   - Date and time
   - Expected attendee count
4. Selects event type from templates
5. Specifies requirements and preferences
6. Reviews and creates event

### 2. Generate Event Plan
1. AI analyzes event requirements
2. Generates comprehensive timeline
3. Creates detailed budget breakdown
4. Recommends suitable vendors
5. Identifies potential risks
6. Provides success metrics

### 3. Manage Event
1. User reviews generated plan
2. Modifies timeline and tasks
3. Adjusts budget allocations
4. Contacts recommended vendors
5. Tracks progress with checklist
6. Updates status and notes

### 4. Execute Event
1. Follow timeline and checklist
2. Monitor budget vs. actual costs
3. Coordinate with vendors
4. Handle last-minute changes
5. Collect feedback and metrics
6. Complete post-event analysis

## Features

### 1. Event Templates
```typescript
export const EVENT_TEMPLATES = {
  corporate_conference: {
    name: 'Corporate Conference',
    category: 'corporate',
    defaultDuration: 8, // hours
    phases: [
      'Planning & Strategy',
      'Venue & Logistics',
      'Speaker Coordination',
      'Marketing & Registration',
      'Technical Setup',
      'Event Execution',
      'Post-Event Follow-up'
    ],
    budgetCategories: [
      'Venue & Catering',
      'Speakers & Entertainment',
      'Marketing & Materials',
      'Technology & AV',
      'Staff & Services',
      'Contingency'
    ]
  },
  
  wedding: {
    name: 'Wedding Celebration',
    category: 'social',
    defaultDuration: 6,
    phases: [
      'Initial Planning',
      'Venue Selection',
      'Vendor Coordination',
      'Guest Management',
      'Final Preparations',
      'Wedding Day',
      'Post-Wedding'
    ],
    budgetCategories: [
      'Venue & Reception',
      'Catering & Bar',
      'Photography & Video',
      'Flowers & Decorations',
      'Music & Entertainment',
      'Attire & Beauty',
      'Transportation',
      'Miscellaneous'
    ]
  }
};
```

### 2. Smart Budget Allocation
```typescript
// AI-powered budget allocation based on event type and size
const generateSmartBudget = (eventData: EventRequirements): EventBudget => {
  const totalBudget = eventData.budget;
  const eventType = eventData.eventType;
  const attendeeCount = eventData.attendeeCount;
  
  // Get budget allocation percentages for event type
  const allocations = getBudgetAllocations(eventType);
  
  // Adjust allocations based on attendee count
  const adjustedAllocations = adjustForScale(allocations, attendeeCount);
  
  // Create budget categories
  const categories = adjustedAllocations.map(allocation => ({
    id: allocation.id,
    name: allocation.name,
    allocatedAmount: totalBudget * allocation.percentage,
    estimatedCost: 0,
    actualCost: 0,
    items: generateBudgetItems(allocation, attendeeCount)
  }));
  
  return {
    totalBudget,
    categories,
    contingency: totalBudget * 0.1, // 10% contingency
    actualSpent: 0,
    remaining: totalBudget
  };
};
```

### 3. Vendor Matching
```typescript
// Match vendors based on event requirements and location
const matchVendors = async (eventData: EventRequirements): Promise<VendorRecommendation[]> => {
  const requiredServices = getRequiredServices(eventData.eventType);
  const location = eventData.location;
  const budget = eventData.budget;
  
  const vendors = [];
  
  for (const service of requiredServices) {
    const serviceVendors = await findVendorsByService(
      service,
      location,
      budget,
      eventData.attendeeCount
    );
    
    // Score vendors based on multiple factors
    const scoredVendors = serviceVendors.map(vendor => ({
      ...vendor,
      score: calculateVendorScore(vendor, eventData)
    }));
    
    // Sort by score and take top recommendations
    vendors.push(...scoredVendors
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
    );
  }
  
  return vendors;
};
```

### 4. Risk Assessment
```typescript
// Identify and assess event risks
const assessEventRisks = (eventData: EventRequirements): RiskAssessment[] => {
  const risks = [];
  
  // Weather risks for outdoor events
  if (eventData.location?.type === 'outdoor') {
    risks.push({
      type: 'weather',
      probability: 'medium',
      impact: 'high',
      mitigation: 'Secure backup indoor venue or tent rental'
    });
  }
  
  // Vendor risks
  if (eventData.attendeeCount > 200) {
    risks.push({
      type: 'vendor_capacity',
      probability: 'low',
      impact: 'high',
      mitigation: 'Confirm vendor capacity and have backup options'
    });
  }
  
  // Budget risks
  if (eventData.budget < getMinimumBudget(eventData)) {
    risks.push({
      type: 'budget_shortfall',
      probability: 'high',
      impact: 'medium',
      mitigation: 'Prioritize essential services and seek additional funding'
    });
  }
  
  return risks;
};
```

## Error Handling

### Common Errors
- `InvalidEventType`: Unsupported event type
- `BudgetInsufficient`: Budget too low for requirements
- `VendorUnavailable`: No vendors available for date/location
- `TimelineConflict`: Conflicting timeline requirements
- `GenerationFailed`: AI plan generation failed

### Validation Rules
```typescript
const validateEventRequirements = (requirements: EventRequirements): string[] => {
  const errors: string[] = [];
  
  if (!requirements.eventType) {
    errors.push('Event type is required');
  }
  
  if (requirements.attendeeCount <= 0) {
    errors.push('Attendee count must be greater than 0');
  }
  
  if (requirements.budget <= 0) {
    errors.push('Budget must be greater than 0');
  }
  
  const startDate = new Date(requirements.startDate);
  const endDate = new Date(requirements.endDate);
  
  if (startDate >= endDate) {
    errors.push('End date must be after start date');
  }
  
  if (startDate < new Date()) {
    errors.push('Event date cannot be in the past');
  }
  
  // Check minimum budget for event type and size
  const minBudget = getMinimumBudget(requirements);
  if (requirements.budget < minBudget) {
    errors.push(`Minimum budget for this event is $${minBudget}`);
  }
  
  return errors;
};
```

## Usage Examples

### Create Event
```typescript
const { createEvent } = useEvent();

const handleCreateEvent = async () => {
  try {
    const event = await createEvent({
      name: 'Annual Company Conference',
      description: 'Our yearly all-hands meeting and team building event',
      type: 'corporate_conference',
      startDate: '2024-06-15T09:00:00Z',
      endDate: '2024-06-15T17:00:00Z',
      attendeeCount: 150,
      budget: 25000,
      requirements: {
        eventType: 'corporate_conference',
        attendeeCount: 150,
        budget: 25000,
        startDate: '2024-06-15T09:00:00Z',
        endDate: '2024-06-15T17:00:00Z',
        preferences: {
          style: 'professional',
          dietary: ['vegetarian', 'gluten-free'],
          accessibility: true,
          sustainability: true
        },
        services: ['catering', 'av_equipment', 'photography']
      }
    });
    
    console.log('Event created:', event);
  } catch (error) {
    console.error('Failed to create event:', error);
  }
};
```

### Generate Event Plan
```typescript
const { generateEventPlan } = useEvent();

const handleGeneratePlan = async (eventId: string) => {
  try {
    const updatedEvent = await generateEventPlan(eventId, {
      eventType: 'corporate_conference',
      attendeeCount: 150,
      budget: 25000,
      startDate: '2024-06-15T09:00:00Z',
      endDate: '2024-06-15T17:00:00Z',
      preferences: {
        style: 'professional',
        dietary: ['vegetarian', 'gluten-free'],
        accessibility: true,
        sustainability: true
      },
      services: ['catering', 'av_equipment', 'photography']
    });
    
    console.log('Event plan generated:', updatedEvent);
  } catch (error) {
    console.error('Failed to generate plan:', error);
  }
};
```