// src/types/event.ts
import { ApiResponse, ErrorResponse } from './api';

export type EventStatus = 'started' | 'announcement_ready' | 'generating_images' | 'images_ready' | 'generating_prompts' | 'prompts_generated' | 'generating_videos' | 'completed' | 'error';

export interface VideoPrompt {
  visual_symbol: string;
  movement: string;
  color_palette: string;
  lighting: string;
  meaning: string;
  audio: string;
  style: string;
  prompt: string;
}

export interface PreviewImage {
  url: string;
  style: string;
  description?: string;
  feedback_based?: string;
}

export interface StartEventRequest {
  event_name: string;
  date_time?: string;
  location?: string;
  tone?: string;
}

export interface ChatMessageRequest {
  message: string;
}

export interface ImageFeedbackRequest {
  selected_images: number[];
  feedback?: string;
  regenerate?: boolean;
}

export interface AcceptImagesResponse {
  task_id: string;
  message: string;
}

export interface EventTask {
  task_id: string;
  event_name: string;
  status: EventStatus;
  progress: number;
  created_at: number;
  current_step?: string;
  error?: string;
  updated_at?: number;
  date_time?: string;
  location?: string;
  tone?: string;
  video_urls?: string[];
  preview_image_urls?: PreviewImage[];
  current_announcement?: string;
  has_pending_announcement?: boolean;
}

export interface EventResponse {
  task_id: string;
  status: string;
  message: string;
}

export interface ChatResponse {
  task_id: string;
  message: string;
}

export interface VideoPromptResponse {
  task_id: string;
  prompts: VideoPrompt[];
}

export interface ImageFeedbackResponse {
  task_id: string;
  message: string;
  selected_images: number;
  regenerating?: boolean;
}

export interface PreviewImagesResponse {
  task_id: string;
  preview_images: PreviewImage[];
  status: EventStatus;
}

export interface EventTasksListResponse {
  tasks: EventTask[];
  next_token?: string;
  count: number;
}

export interface EventStatusResponse {
  task_id: string;
  status: EventStatus;
  progress: number;
  current_step?: string;
  announcement?: string;
  conversation_history?: ChatMessage[];
  video_prompts?: VideoPrompt[];
  video_urls?: string[];
  preview_image_urls?: PreviewImage[];
  error?: string;
  created_at: number;
  updated_at?: number;
  announcement_system_prompt?: string;
  image_system_prompt?: string;
  video_system_prompt?: string;
  event_name?: string;
  date_time?: string;
  location?: string;
  tone?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface UpdateSystemPromptsRequest {
  announcement_prompt?: string;
  image_prompt?: string;
  video_prompt?: string;
}

export interface UpdateSystemPromptsResponse {
  task_id: string;
  message: string;
  announcement_prompt_updated: boolean;
  image_prompt_updated: boolean;
  video_prompt_updated: boolean;
}

export interface AcceptAnnouncementResponse {
  task_id: string;
  status: string;
  message: string;
}

export interface RefreshUrlsResponse {
  task_id: string;
  message: string;
  refreshed_urls: string[];
  stats?: {
    videos: number;
    preview_images: number;
    selected_images: number;
  };
}

export interface TaskListParams {
  limit?: number;
  last_evaluated_key?: string;  // For token-based pagination
  status?: EventStatus;
  sort_order?: 'asc' | 'desc';
}