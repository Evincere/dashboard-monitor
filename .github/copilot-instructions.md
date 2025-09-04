# AI Agent Instructions for MPD Dashboard Monitor

## Project Overview
This is a Next.js + TypeScript dashboard for monitoring public job contests at MPD (Ministerio Público de la Defensa). The system manages document validation, applicant tracking, and official reporting.

## Key Architecture Patterns

### Document Validation Flow
- Documents go through states: `PENDING` -> `APPROVED`/`REJECTED`
- Validation requires checking both mandatory and optional documents
- See `/src/app/(dashboard)/postulations/[dni]/documents/validation/page.tsx` for implementation

### State Management
- Zustand for global state (validation store)
- Critical stores:
  - `validationStore`: Manages document validation state
  - Document states tracked via `validationStatus` enum

### Component Patterns
1. Main Layout Components:
   ```tsx
   // Standard panel structure
   <div className="h-screen flex flex-col bg-background">
     <Header />
     <MainContent />
     <Footer />
   </div>
   ```

2. Form Validation:
   - Use local state for form data
   - Validate before API calls
   - Show toast notifications for success/error

### API Integration
- Base API routes under `/api/proxy-backend/`
- Use `apiUrl()` utility for endpoint construction
- Always include error handling with toast notifications

## Development Workflows

### Document Validation Implementation
1. State changes must update the store AND the backend
2. User feedback required for all actions
3. Always preserve audit trail (validatedAt, validatedBy)

### Testing Standards
- Test files located next to components
- Use `*.test.tsx` naming convention
- Required test coverage for validation logic

## Common Pitfalls
1. Document state transitions must be atomic
2. Modal state needs cleanup on unmount
3. Always handle loading states
4. Remember to update stats after validation changes

## Project-Specific Conventions

### Component Structure
- Place shared components in `@/components/`
- Page components use client-side rendering ("use client")
- Keep validation logic in hooks or stores

### State Updates
```typescript
// Correct pattern for document updates
const updatedDocuments = documents.map(doc =>
  doc.id === currentDocument.id
    ? { ...doc, validationStatus: "PENDING", validatedAt: undefined }
    : doc
);
setDocuments(updatedDocuments);
updateStats();
```

### Error Handling
- Use toast notifications for user feedback
- Log errors to console in development
- Include error details in production logs

## Integration Points
1. Backend API (`/api/proxy-backend/`)
2. Document Preview Service
3. Email Notification System
4. Audit Trail System

## Performance Guidelines
1. Memoize expensive calculations
2. Use optimistic updates for better UX
3. Implement proper loading states
4. Cache document previews when possible
