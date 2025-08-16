# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**MPD Insights** is an intelligent dashboard for managing and analyzing data from the Ministerio Público de la Defensa (MPD) contest system. It's built with Next.js 15 and integrates multiple AI providers for natural language database queries and analysis.

## Development Commands

### Core Development
```bash
# Start development server (port 9002)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Start with minimal memory allocation
npm start:minimal

# Type checking
npm run typecheck

# Linting
npm run lint
```

### AI Development (Genkit)
```bash
# Start Genkit development server
npm run genkit:dev

# Start Genkit with file watching
npm run genkit:watch
```

### Testing
```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run
```

## Project Architecture

### High-Level Structure

The application follows a modular architecture with clear separation of concerns:

#### 1. **AI System (src/ai/)**
- **Unified AI Provider System**: Supports multiple AI providers (Gemini, OpenAI, Claude) with automatic fallback
- **Intelligent Query Router**: Automatically determines whether to use simple or complex query processing
- **Embeddings System**: Contextual learning, persistent memory, and semantic search capabilities
- **Specialized Prompts**: Optimized prompts for different query types and AI providers

Key files:
- `src/ai/config.ts` - AI provider configuration and validation
- `src/ai/flows/intelligent-query-router.ts` - Main query processing logic
- `src/ai/embeddings/` - Vector embeddings and contextual learning system

#### 2. **Database Layer (src/services/)**
- **Optimized Connection Pooling**: MySQL connection pool with performance monitoring
- **Query Optimization**: Prepared statements, transaction support, and slow query detection
- **Schema Introspection**: Dynamic database schema discovery for AI query generation

Key file:
- `src/services/database.ts` - Database connection and query execution

#### 3. **Next.js App Structure (src/app/)**
- **(dashboard)/** - Main dashboard pages with route groups
- **api/** - API routes for data fetching, AI operations, and system health
- **Route Organization**:
  - `/dashboard` - Main dashboard with metrics and charts
  - `/ai-query` - Complex AI-powered queries
  - `/natural-query` - Simple natural language queries
  - `/users`, `/contests`, `/documents` - Data management pages

### Data Flow Architecture

1. **User Query** → **Intelligent Query Router** → **AI Provider** → **SQL Generation**
2. **Database Execution** → **Results Processing** → **Contextual Learning Storage**
3. **Response Quality Assessment** → **User Response**

### AI Provider System

The application uses an agnostic AI provider system that can work with multiple services:

- **Primary**: Google Gemini (fast, JSON-native responses)
- **Fallbacks**: OpenAI GPT-4o, Claude (Anthropic)
- **Dynamic Switching**: Automatic failover and manual provider selection
- **Configuration**: Environment variable-based setup with validation

### Caching and Performance

- **Schema Caching**: Database schema cached for 1 hour (configurable)
- **Query Caching**: Intelligent caching of frequently accessed data
- **Connection Pooling**: Optimized MySQL connection management
- **Performance Monitoring**: Query execution tracking and slow query detection

## Environment Configuration

### Required Environment Variables

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=mpd_concursos

# AI Provider Configuration (at least one required)
AI_PROVIDER=gemini  # Default provider

# Google Gemini
GOOGLE_GENAI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.0-flash

# OpenAI (optional)
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini

# Claude/Anthropic (optional)
ANTHROPIC_API_KEY=your_claude_key
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

### Optional Configuration
```bash
# Performance Tuning
SCHEMA_CACHE_DURATION=3600000  # 1 hour
DB_CONNECTION_LIMIT=20
SLOW_QUERY_THRESHOLD=1000  # milliseconds
ENABLE_PERFORMANCE_MONITORING=true

# Node.js Memory Management
NODE_OPTIONS='--max-old-space-size=1024'
```

## Database Schema

The system connects to the `mpd_concursos` MySQL database with these key tables:
- `users` (user_entity) - User information
- `contests` - Contest management
- `inscriptions` - User contest registrations
- `documents` - File uploads and management
- `examinations`, `questions`, `answers` - Exam system

The AI system uses `INFORMATION_SCHEMA` for dynamic schema discovery and SQL generation.

## Key Development Patterns

### AI Query Processing
1. **Intent Analysis**: Determine query complexity and requirements
2. **Route Selection**: Simple (single SQL) vs Complex (multiple queries + analysis)
3. **Context Enhancement**: Use embeddings and contextual learning for improved responses
4. **Quality Metrics**: Track response quality and user feedback

### Database Operations
- Always use the `executeQuery` function for database interactions
- Leverage `executeTransaction` for multi-query operations
- Use `executePreparedStatement` for repeated queries with parameters
- Monitor performance with built-in query timing and logging

### Error Handling
- AI provider fallbacks are automatic
- Database connection errors trigger pool recreation
- All API endpoints include comprehensive error responses
- Performance monitoring continues even during errors

## Testing Strategy

The project includes comprehensive test coverage:
- **Unit Tests**: Individual component testing
- **Integration Tests**: Database and AI system integration
- **API Tests**: Endpoint functionality and error handling
- **Performance Tests**: Query optimization and caching validation

Test files are located in `src/__tests__/` and follow the pattern `*.test.ts`.

## Container Deployment

The application supports Docker deployment:
- **Base Port**: 9002
- **Memory Limit**: 1GB (configurable)
- **Network**: Connects to existing `mpd-concursos-network`
- **Volumes**: Persistent vector store for embeddings

## AI Provider Migration

The system maintains backward compatibility with the original Genkit implementation while providing enhanced capabilities through the unified provider system. When migrating AI functionality:

1. Import from `@/ai/unified` instead of `@/ai/genkit`
2. Use the new `generateWithSchema()` method for structured responses
3. Leverage `definePrompt()` and `defineFlow()` for reusable AI operations
4. Configure multiple providers for redundancy

This architecture ensures high availability, optimal performance, and intelligent query processing while maintaining code maintainability and extensibility.
