// src/types/scenario.ts
import { ApiResponse, ErrorResponse } from './api';

export type ScenarioStatus = 
  'started' | 
  'structure_ready' | 
  'generating_content' | 
  'content_ready' | 
  'generating_images' | 
  'images_ready' | 
  'generating_video_prompts' | 
  'video_prompts_ready' | 
  'generating_videos' | 
  'completed' | 
  'error';

export interface BrandGuidelines {
  colors?: string[];
  fonts?: string[];
  logo_url?: string;
  voice?: string[];
}

export interface StructureSection {
  title: string;
  description: string;
  key_points?: string[];
  media_suggestions?: string[];
}

export interface ContentSection {
  title: string;
  content: string;
}

export interface ContentObject {
  sections: ContentSection[];
}

export interface ImageItem {
  url: string;
  title?: string;
  description?: string;
  prompt?: string;
  error?: string;
}

export interface VideoPrompt {
  title: string;
  visual_sequence: string;
  text_overlay: string;
  call_to_action: string;
  audio: string;
  prompt: string;
}

export interface ProjectRequest {
  title: string;
  scenario_type: string;
  description?: string;
  target_audience?: string;
  content_tone?: string;
  campaign_goals?: string;
  primary_cta?: string;
  success_metric?: string;
  key_elements?: string[];
  visual_style?: string;
  distribution_channels?: string[];
  brand_guidelines?: BrandGuidelines;
  template_id?: string;
}

export interface RequirementsModel {
  title: string;
  scenario_type: string;
  description: string;
  target_audience: string;
  content_tone: string;
  campaign_goals?: string;
  primary_cta?: string;
  success_metric?: string;
  key_elements: string[];
  visual_style: string;
  distribution_channels: string[];
  brand_guidelines?: BrandGuidelines;
}

export interface StructureFeedbackModel {
  feedback: string;
  sections_to_modify?: number[];
  format?: string;
}

export interface ContentFeedbackModel {
  feedback: string;
  sections?: Record<string, string>;
  tone_adjustment?: string;
  content_length?: string;
  technical_level?: string;
}

export interface ImageFeedbackModel {
  feedback: string;
  style_preference?: string;
}

export interface VideoSettingsModel {
  text_overlays?: any[];
  transitions?: string;
  transition_duration?: number;
  voice_over?: string;
  voice_selection?: string;
  background_music?: string;
}

export interface ExportSettingsModel {
  format: string;
  quality: string;
  add_watermark: boolean;
}

export interface ProjectResponse {
  task_id: string;
  status: string;
  message: string;
}

export interface StructureResponse {
  task_id: string;
  structure: StructureSection[];
  ai_insights?: string[];
}

export interface ContentResponse {
  task_id: string;
  content: ContentObject;
  seo_score?: number;
  readability_score?: string;
}

export interface ImageResponse {
  task_id: string;
  images: ImageItem[];
  style_info?: {
    visual_style?: string;
    brand_guidelines?: BrandGuidelines;
    concepts?: any[];
  };
}

export interface VideoResponse {
  task_id: string;
  video_urls: string[];
  thumbnail_url?: string;
  duration?: number;
}

export interface VideoGenerationResponse {
  task_id: string;
  status: string;
  message: string;
  estimated_completion_time?: string;
}

export interface RepurposeResponse {
  platform: string;
  content: string;
  task_id: string;
}

export interface ProjectSummary {
  task_id: string;
  title: string;
  status: ScenarioStatus;
  progress: number;
  scenario_type: string;
  current_step?: string;
  created_at: number;
  updated_at?: number;
  error?: string;
}

export interface ProjectsListResponse {
  projects: ProjectSummary[];
  pagination_token?: string;
}

export interface ProjectStatusResponse {
  task_id: string;
  title: string;
  status: ScenarioStatus;
  progress: number;
  current_step?: string;
  created_at: number;
  updated_at?: number;
  structure?: StructureSection[];
  content?: ContentObject;
  images?: ImageItem[];
  video_urls?: string[];
  error?: string;
  scenario_type: string;
  description?: string;
  target_audience?: string;
  content_tone?: string;
  campaign_goals?: string;
  primary_cta?: string; 
  success_metric?: string;
  key_elements?: string[];
  visual_style?: string;
  distribution_channels?: string[];
  brand_guidelines?: BrandGuidelines;
  video_prompts?: VideoPrompt[];
  seo_score?: number;
  readability_score?: string;
}

export interface ExportResponse {
  task_id: string;
  export_url: string;
  format: string;
  quality: string;
  message: string;
}