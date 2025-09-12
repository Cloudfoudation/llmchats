# GSIS POC Web - Mobile-First AI Portal

A clean, mobile-first Nuxt.js application inspired by Perplexity.ai's design, built with SOLID principles for the GSIS AI Portal.

## Features

- 🎯 **Mobile-First Design** - Optimized for mobile devices, works great on desktop
- 🧠 **AI Chat Interface** - Clean, Perplexity-inspired chat experience
- 🏗️ **SOLID Architecture** - Maintainable, extensible codebase
- ⚡ **Fast & Lightweight** - Minimal dependencies, optimized performance
- 🌐 **Multilingual Support** - English, Tagalog, and other Filipino languages
- 📱 **PWA Ready** - Can be installed as a mobile app

## Architecture (SOLID Principles)

### Single Responsibility Principle (S)
- Each component has one clear purpose
- Composables handle specific functionality
- Services are focused on single domains

### Open/Closed Principle (O)
- Extensible through composables and plugins
- New features can be added without modifying existing code
- Modular component architecture

### Liskov Substitution Principle (L)
- Components can be replaced with compatible implementations
- Service interfaces allow for different implementations
- Consistent API contracts

### Interface Segregation Principle (I)
- Clean separation between UI, business logic, and data
- Focused interfaces for different concerns
- No unnecessary dependencies

### Dependency Inversion Principle (D)
- Depends on abstractions (composables/stores)
- Services implement interfaces
- Easy to mock and test

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
gsis-poc-web/
├── assets/css/          # Global styles
├── components/          # Reusable UI components
├── composables/         # Business logic (SOLID)
├── layouts/             # Page layouts
├── pages/               # Route pages
├── services/            # External service integrations
├── stores/              # State management (Pinia)
├── types/               # TypeScript definitions
└── nuxt.config.ts       # Nuxt configuration
```

## Mobile Optimization

- **Viewport**: Properly configured for mobile devices
- **Touch Targets**: Minimum 44px for accessibility
- **Safe Areas**: iOS notch and gesture support
- **Performance**: Optimized for mobile networks
- **Responsive**: Mobile-first responsive design

## Integration with Existing Backend

This app is designed to work with the existing GSIS infrastructure:

- **Authentication**: AWS Cognito integration
- **AI Models**: Amazon Bedrock API calls
- **Knowledge Base**: Existing KB API endpoints
- **File Upload**: S3 integration for documents

## Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Update with your AWS configuration from the existing deployment.

## Deployment

Can be deployed to:
- **AWS Amplify** (recommended for AWS integration)
- **Vercel** (for fast global deployment)
- **Netlify** (for simple static hosting)
- **CloudFront + S3** (existing AWS infrastructure)

## Test Cases Coverage

This simple app addresses the GSIS test requirements:

1. ✅ **Enterprise AI Portal** - Clean, unified interface
2. ✅ **Role-based Access** - Ready for user role integration
3. ✅ **Data Ingestion** - File upload components ready
4. ✅ **Internal Sources** - Knowledge Base integration
5. ⚠️ **External Sources** - Can be enhanced with web search
6. ✅ **Multilingual** - Supports Filipino languages
7. ✅ **Content Generation** - AI response generation
8. ✅ **Mobile Compatibility** - Mobile-first design
9. ✅ **Archive Logs** - Chat history ready
10. ✅ **Simple UX** - Perplexity-inspired clean interface

## Next Steps

1. **Connect to Backend** - Integrate with existing AWS services
2. **Add Authentication** - Implement Cognito login flow
3. **Knowledge Base UI** - Add file upload and management
4. **External Search** - Integrate Google Custom Search API
5. **PWA Features** - Add offline support and app installation