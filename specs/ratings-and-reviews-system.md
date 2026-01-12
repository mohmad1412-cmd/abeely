# Scope of Work for Service Requests

## Overview
Add a dedicated "Scope of Work" field to service requests to allow users to provide detailed, structured information about the specific work required. This field will complement the existing description field and help service providers better understand project requirements, leading to more accurate offers and better matching between requests and providers.

## User Stories
- [ ] As a service requester, I want to specify the scope of work for my request so that service providers can better understand what needs to be done
- [ ] As a service provider, I want to see a clear scope of work for requests so that I can prepare accurate offers
- [ ] As a service requester, I want to edit the scope of work after creating a request so that I can clarify requirements based on questions from providers
- [ ] As a service provider, I want to view the scope of work in a structured format so that I can quickly assess if I can fulfill the request

## Requirements

### Functional Requirements
- [ ] Add a scope field to the Request interface and database schema
- [ ] Create UI component for entering and editing scope of work in CreateRequestV2
- [ ] Display scope of work in RequestDetail component with proper formatting
- [ ] Allow scope of work to be optional (backward compatible with existing requests)
- [ ] Support rich text or structured format for scope (markdown or plain text)
- [ ] Enable editing of scope for request authors (when status is "active")
- [ ] Show scope of work in request cards/list views (optional, may be truncated)

### Non-Functional Requirements
- [ ] Maintain backward compatibility with existing requests (scope field is optional)
- [ ] Ensure scope field is searchable/filterable if needed for future features
- [ ] Support Arabic and English text input
- [ ] Character limit for scope field (e.g., 2000-5000 characters)
- [ ] Proper validation and error handling for scope input

## Acceptance Criteria
- [ ] Users can add scope of work when creating a new service request
- [ ] Scope of work is displayed prominently in request detail view
- [ ] Request authors can edit scope while request status is "active"
- [ ] Existing requests without scope continue to function normally
- [ ] Scope field supports multi-line text input
- [ ] Scope is saved and retrieved correctly from database
- [ ] UI is responsive and works on mobile devices

## Technical Considerations
- [ ] Add scope?: string field to Request interface in types.ts
- [ ] Update database schema to add scope column to equests table
- [ ] Update request creation/editing services to handle scope field
- [ ] Modify CreateRequestV2 component to include scope input field
- [ ] Update RequestDetail component to display scope field
- [ ] Consider migration strategy for existing requests (NULL or empty string)
- [ ] Update AI service if it processes request descriptions (may need to consider scope)
- [ ] Ensure scope is included in request exports/sharing if applicable

## Database Schema
- [ ] Add scope column to equests table:
  - Type: 	ext or archar(5000)
  - Nullable: 	rue (to support existing requests)
  - Default: NULL
- [ ] Consider indexing if scope will be searchable
- [ ] Update RLS policies if needed (scope should follow same visibility as request)

## API Endpoints
- [ ] Update request creation endpoint to accept scope parameter
- [ ] Update request update endpoint to allow editing scope
- [ ] Ensure request retrieval endpoints include scope in response
- [ ] No new endpoints required (uses existing request CRUD operations)

## UI/UX Considerations
- [ ] Add scope input field in CreateRequestV2 form (after description field)
- [ ] Use textarea component for multi-line scope input
- [ ] Add placeholder text with examples: "مثال: تنظيف شامل للشقة 3 غرف، مطبخ، صالون، مع تطهير الحمامات..."
- [ ] Display scope in RequestDetail with clear visual separation from description
- [ ] Show "Scope of Work" header/label in Arabic: "نطاق العمل"
- [ ] Consider collapsible section for scope if it's long
- [ ] Add edit button/icon for scope when user is the request author
- [ ] Ensure proper spacing and typography for readability
- [ ] Consider character counter for scope input

## Testing Requirements
- [ ] Unit Tests: Test scope field in Request interface and type definitions
- [ ] Integration Tests: Test scope saving and retrieval from database
- [ ] E2E Tests: Test creating request with scope, viewing scope, editing scope
- [ ] Test backward compatibility with existing requests (without scope)
- [ ] Test validation (character limits, required/optional behavior)
- [ ] Test scope editing permissions (only author can edit active requests)

## Security Considerations
- [ ] Validate scope input length to prevent abuse
- [ ] Sanitize scope input to prevent XSS attacks
- [ ] Ensure scope follows same visibility rules as request (RLS policies)
- [ ] Validate user permissions for editing scope (only request author)
- [ ] Rate limiting for scope updates to prevent spam

## Performance Considerations
- [ ] Scope field should not significantly impact request loading performance
- [ ] Consider truncation for list views if scope is displayed
- [ ] Index scope field if it will be used in search/filter operations
- [ ] Ensure scope text doesn't bloat request payload size

## Dependencies
- [ ] No new external dependencies required
- [ ] Uses existing UI components (textarea, form components)
- [ ] Uses existing database infrastructure (Supabase)
- [ ] Uses existing request service functions

## Timeline
- **Estimated Duration:** 2-3 days
- **Priority:** Medium

## Notes
- Scope field is distinct from description field:
  - Description: General overview of the request
  - Scope: Detailed, specific work requirements
- Consider future enhancements:
  - Structured scope format (checkboxes, bullet points)
  - Scope templates for common service types
  - AI-assisted scope generation from description
  - Scope comparison feature for providers
- May want to add scope to offers as well in the future
- Consider scope in matching algorithm if service provider matching is implemented
