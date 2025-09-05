from pydantic import BaseModel, Field
from typing import List, Optional, Union, Dict, Any
from enum import Enum
from datetime import datetime

class MessageRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"

class MessageType(str, Enum):
    TEXT = "text"
    CHAT = "chat"
    IMAGE = "image"
    VIDEO = "video"
    MULTIMODAL = "multimodal"

class AttachmentType(str, Enum):
    IMAGE = "image"
    TEXT = "text"
    VIDEO = "video"

class Attachment(BaseModel):
    file_name: Optional[str] = None
    file_type: str
    file_size: Optional[int] = None
    file_content: str  # base64 encoded content

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class MessageMetadata(BaseModel):
    citations: Optional[List[Dict]] = None
    guardrailAction: Optional[Dict] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class Message(BaseModel):
    role: MessageRole
    content: str
    type: MessageType = MessageType.TEXT
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    attachments: Optional[List[Attachment]] = None
    metadata: Optional[MessageMetadata] = None
    imageData: Optional[Union[str, List[str]]] = None  # For image responses

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

    def dict(self, *args, **kwargs):
        d = super().dict(*args, **kwargs)
        if d.get('created_at'):
            d['created_at'] = d['created_at'].isoformat()
        return d

    def to_dict(self) -> Dict[str, Any]:
        """Convert message to a plain dictionary for JSON serialization"""
        return {
            'role': self.role.value,
            'content': self.content,
            'type': self.type.value,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'attachments': [att.dict() for att in self.attachments] if self.attachments else None,
            'metadata': self.metadata.dict() if self.metadata else None,
            'imageData': self.imageData
        }

class ModelParams(BaseModel):
    temperature: float = 0.7
    topP: float = 0.9
    maxTokens: int = 4096
    maxLength: Optional[int] = None
    stopSequences: Optional[List[str]] = None
    modelId: str
    
    # Image generation parameters
    numImages: Optional[int] = 1
    imageSize: Optional[str] = None
    imageWidth: Optional[int] = None
    imageHeight: Optional[int] = None
    cfgScale: Optional[float] = 7.5
    seed: Optional[int] = None
    stylePreset: Optional[str] = None
    quality: Optional[str] = None
    steps: Optional[int] = None
    
    # Image editing parameters
    strength: Optional[float] = 0.7
    negativeText: Optional[str] = None
    negativePrompt: Optional[str] = None
    
    # Task specific parameters
    taskType: Optional[str] = "TEXT_IMAGE"
    controlMode: Optional[str] = None
    controlStrength: Optional[float] = 0.7
    maskPrompt: Optional[str] = None
    maskImage: Optional[str] = None
    returnMask: Optional[bool] = False
    outpaintingMode: Optional[str] = "DEFAULT"
    similarityStrength: Optional[float] = 0.7
    aspectRatio: Optional[str] = "1:1"
    outputFormat: Optional[str] = "png"
    colors: Optional[List[str]] = None
    referenceImage: Optional[str] = None
    
    # Video generation parameters
    videoQuality: Optional[str] = None
    videoDimension: Optional[str] = None
    durationSeconds: Optional[int] = 6
    fps: Optional[int] = 24
    videoTaskType: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ChatRequest(BaseModel):
    conversation_history: List[Message] = Field(default_factory=list)
    model: str
    stream: bool = True
    temperature: float = 0.7
    max_tokens: int = 4096
    top_p: float = 0.9
    system_prompts: Optional[str] = None
    botId: Optional[str] = None
    modelParams: Optional[ModelParams] = None
    # Additional parameters for image/video generation
    image_params: Optional[Dict[str, Any]] = None
    video_params: Optional[Dict[str, Any]] = None
    # Additional model-specific parameters
    anthropic_version: Optional[str] = None
    stop_sequences: Optional[List[str]] = None
    # Support for uploaded images from web/telegram
    uploaded_images: Optional[List[str]] = None

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

    def dict(self, *args, **kwargs):
        d = super().dict(*args, **kwargs)
        if 'conversation_history' in d:
            d['conversation_history'] = [
                msg.to_dict() if isinstance(msg, Message) else msg 
                for msg in d['conversation_history']
            ]
        return d

    def to_dict(self) -> Dict[str, Any]:
        """Convert request to a plain dictionary for JSON serialization"""
        return {
            'conversation_history': [msg.to_dict() for msg in self.conversation_history],
            'model': self.model,
            'stream': self.stream,
            'temperature': self.temperature,
            'max_tokens': self.max_tokens,
            'top_p': self.top_p,  # Added top_p to the dictionary
            'system_prompts': self.system_prompts,
            'botId': self.botId,
            'modelParams': self.modelParams.dict() if self.modelParams else None,
            'image_params': self.image_params,
            'video_params': self.video_params,
            'anthropic_version': self.anthropic_version,
            'stop_sequences': self.stop_sequences
        }