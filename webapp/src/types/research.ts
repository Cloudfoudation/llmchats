// webapp/src/types/research.ts
import { UserInfo, ApiResponse, ErrorResponse } from './api';

export interface PromptConfig {
  report_structure?: string;  // Add this line
  outline_generator_system_prompt?: string;
  section_writer_instructions?: string;
  section_grader_instructions?: string;
  query_writer_instructions?: string;
  initial_research_system_prompt?: string;
  final_section_writer_instructions?: string;
}

export interface PromptTemplateInfo {
  template_id: string;
  name: string;
  description?: string;
  created_at: number;
}

export interface PromptTemplate extends PromptTemplateInfo {
  prompt_config: PromptConfig;
}

export type ResearchStatus = 
  | 'started'
  | 'outline_ready'
  | 'feedback_needed'
  | 'generating'
  | 'completed'
  | 'rejected'
  | 'error'
  | 'regenerating'
  | 'regenerating_outline'
  | 'prompts_updated';

export interface ResearchSection {
  name: string;
  content?: string;
  summary?: string; // Added for more detailed outlines
  [key: string]: any;
}

export interface ResearchOutline {
  title: string;
  sections: ResearchSection[];
}

export interface StartResearchRequest {
  topic: string;
  writing_guidelines?: string;
  generate_images?: boolean;
  prompt_config?: PromptConfig;
}

export interface ResearchTask {
  task_id: string;
  topic: string;
  status: ResearchStatus;
  progress: number;
  created_at: number;
  current_step?: string;
  error?: string;
  last_updated?: number;
  article_url?: string;
  pdf_url?: string;
  html_url?: string;
  image_url?: string;
  title?: string;
  output_dir?: string;
  prompt_config?: PromptConfig;
}

export interface ResearchPdfResponse {
  pdf_url: string;
  format: 'pdf' | 'html';
}

export interface ResearchFeedbackRequest {
  accept_outline: boolean;
  feedback_text?: string;
}

export interface TasksListResponse {
  tasks: ResearchTask[];
  total: number;
  limit: number;
  offset: number;
  filtered: boolean;
}

export interface ResearchStatusResponse {
  task_id: string;
  status: ResearchStatus;
  progress: number;
  current_step?: string;
  outline?: ResearchOutline;
  article?: string;
  article_url?: string;
  pdf_url?: string;
  html_url?: string;
  image_url?: string;
  error?: string;
  created_at: number;
  output_dir?: string;
  prompt_config?: PromptConfig;
}

export interface ResearchOutlineResponse {
  task_id: string;
  title?: string;
  sections?: ResearchSection[];
}

export interface ResearchResponse {
  task_id: string;
  status: ResearchStatus;
  message: string;
}

export interface TaskFilesResponse {
  files: string[];
  task_id: string;
  output_dir?: string;
}

export interface PromptTestRequest {
  prompt_type: string;
  prompt_text: string;
  test_input: string;
  model_id?: string;
}

export interface PromptTestResponse {
  prompt_type: string;
  test_id: string;
  model_output: string;
  model_id: string;
}

export interface SaveTemplateRequest {
  name: string;
  description?: string;
  prompt_config: PromptConfig;
}

export interface UpdatePromptsRequest {
  prompt_config: PromptConfig;
}

export interface TemplatesListResponse {
  templates: PromptTemplateInfo[];
  count: number;
}

export interface UserPromptsResponse {
  prompts: PromptConfig & {
    last_updated?: number;
  };
  message: string;
}