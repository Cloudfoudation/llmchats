# Webapp Modules Documentation

This directory contains detailed documentation for each module in the GSIS AI Portal webapp. Each module document explains:

- **Purpose**: What the module does
- **API Integration**: Which APIs it uses and how
- **Components**: Key React components
- **Implementation**: How it's built in the webapp
- **Usage**: How users interact with it

## Module Overview

| Module | Description | API Endpoints |
|--------|-------------|---------------|
| [Authentication](./authentication.md) | User login, signup, and session management | Cognito User Pool, Identity Pool |
| [Chat System](./chat-system.md) | AI conversations with Bedrock models | Bedrock API, Conversations Table |
| [Agent Management](./agent-management.md) | Create and manage AI agents | Agent Management API |
| [Knowledge Base](./knowledge-base.md) | Document upload and RAG functionality | Knowledge Base API, Document API |
| [User Management](./user-management.md) | Admin user operations | User Management API |
| [Group Management](./group-management.md) | User groups and permissions | Group Management API |
| [Shared Resources](./shared-resources.md) | Share agents and knowledge bases | Shared Resources API |
| [Settings](./settings.md) | User preferences and API keys | Profile API |
| [Research Tool](./research-tool.md) | Deep research functionality | Bedrock Service |
| [Event Composer](./event-composer.md) | Event planning assistant | Bedrock Service |

## Architecture Overview

The webapp follows a modular architecture with:

- **Services Layer**: API communication (`src/services/`)
- **Components Layer**: React UI components (`src/components/`)
- **Hooks Layer**: Custom React hooks (`src/hooks/`)
- **Providers Layer**: Context providers (`src/providers/`)
- **Types Layer**: TypeScript definitions (`src/types/`)

## Getting Started

1. Read the [Authentication](./authentication.md) module first to understand the security model
2. Review [Chat System](./chat-system.md) for the core functionality
3. Explore other modules based on your development needs

## API Configuration

All API endpoints are configured in `.env.local`:

```bash
# Core APIs
NEXT_PUBLIC_AGENT_MANAGEMENT_API_URL=https://d8q6coohkc.execute-api.us-east-1.amazonaws.com/dev/
NEXT_PUBLIC_KNOWLEDGE_BASE_API_URL=https://xll4e886d5.execute-api.us-east-1.amazonaws.com/dev/
NEXT_PUBLIC_USER_MANAGEMENT_API_URL=https://0afocm1d58.execute-api.us-east-1.amazonaws.com/dev/
NEXT_PUBLIC_GROUP_MANAGEMENT_API_URL=https://s3aof4lt9g.execute-api.us-east-1.amazonaws.com/dev/
NEXT_PUBLIC_SHARED_RESOURCES_API_URL=https://efa3i4mkj7.execute-api.us-east-1.amazonaws.com/dev/
```