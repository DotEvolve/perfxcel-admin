# Platform Metrics Revamp Bugfix Design

## Overview

The PlatformMetrics page currently displays hardcoded/static infrastructure data instead of real-time metrics from Heroku. This bugfix implements a complete dynamic revamp by creating a new `/infra` endpoint in the API Gateway that fetches real Heroku metrics via the Heroku Platform API. The fix will enable administrators to monitor actual platform health, resource utilization, dyno status, and comprehensive infrastructure information in real-time.

The approach involves:

1. Adding a new `/infra` endpoint to the API Gateway
2. Integrating with Heroku Platform API using OAuth tokens
3. Fetching dyno metrics, app details, and formation information
4. Transforming Heroku API responses into the expected frontend format
5. Preserving all existing service health check functionality

## Glossary

- **Bug_Condition (C)**: The condition where the PlatformMetrics page displays static/hardcoded infrastructure data instead of real-time Heroku metrics
- **Property (P)**: The desired behavior where the page displays real-time infrastructure data fetched from Heroku Platform API
- **Preservation**: Existing service health check functionality (API Gateway, Workflow Service, Database, Document Storage) that must remain unchanged
- **PlatformMetrics**: The React component in `src/pages/PlatformMetrics.tsx` that displays infrastructure monitoring dashboard
- **infraStack**: The state variable holding infrastructure details displayed in the "Infrastructure Stack" table
- **Heroku Platform API**: RESTful API for managing and monitoring Heroku applications (https://devcenter.heroku.com/articles/platform-api-reference)
- **Dyno**: A lightweight Linux container that runs a single user-specified command in Heroku
- **Formation**: The configuration of dyno types and quantities for a Heroku app

## Bug Details

### Fault Condition

The bug manifests when the PlatformMetrics page loads and attempts to fetch infrastructure data from the `/infra` endpoint. The endpoint either returns no data, static placeholder data, or is not properly implemented to fetch real-time metrics from Heroku Platform API.

**Formal Specification:**

```
FUNCTION isBugCondition(request)
  INPUT: request of type HTTPRequest to /infra endpoint
  OUTPUT: boolean

  RETURN request.endpoint == "/infra"
         AND (response.data == null OR response.data == staticData OR NOT fetchedFromHeroku(response.data))
         AND NOT containsRealTimeDynoMetrics(response.data)
END FUNCTION
```

### Examples

- **Example 1**: User loads PlatformMetrics page → `/infra` endpoint returns `null` or empty array → Infrastructure Stack table shows "Loading infrastructure details..." indefinitely
- **Example 2**: User loads PlatformMetrics page → `/infra` endpoint returns hardcoded data `[{component: "API Gateway", provider: "Heroku", region: "us-east-1", type: "Web"}]` → Data never changes on refresh, doesn't reflect actual Heroku state
- **Example 3**: User refreshes page after deploying new dyno → Infrastructure data remains unchanged because it's not fetching from Heroku Platform API
- **Edge Case**: User has multiple Heroku apps (cos-api-gateway, cos-workflow, cos-rules) → System should display all apps with their respective dyno formations and metrics

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Service health checks for API Gateway, Workflow Service, Database, and Document Storage must continue to work exactly as before
- The `checkHealth()` function must continue to test endpoints and measure response times
- The 30-second auto-refresh interval for service health checks must remain unchanged
- The "Refresh Status" button must continue to trigger health checks for all monitored services
- The overall status banner ("All Systems Operational" or degraded status) must continue to display based on service health
- Authentication mechanism for API calls must remain unchanged
- Page layout, UI components, styling, and user experience must remain unchanged

**Scope:**
All functionality that does NOT involve the Infrastructure Stack table should be completely unaffected by this fix. This includes:

- Service health monitoring cards and their status indicators
- Response time measurements and display
- Overall status banner logic
- Auto-refresh timer functionality
- Manual refresh button behavior

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Missing Endpoint Implementation**: The `/infra` endpoint in the API Gateway (`govnix-api-gateway/api/index.js`) is not implemented at all, causing the frontend request to fail or return 404

2. **No Heroku API Integration**: Even if the endpoint exists, there is no integration with Heroku Platform API to fetch real-time metrics. The code would need to:
   - Use Heroku OAuth token for authentication
   - Make requests to `https://api.heroku.com/apps` to list all apps
   - Fetch dyno information for each app via `/apps/{app-id}/dynos`
   - Fetch formation details via `/apps/{app-id}/formation`

3. **Missing Environment Variables**: The API Gateway lacks Heroku API credentials (OAuth token or API key) in environment configuration, preventing authentication with Heroku Platform API

4. **Data Transformation Gap**: Even if Heroku data is fetched, there may be no logic to transform the Heroku API response format into the `InfraDetail` interface expected by the frontend

## Correctness Properties

Property 1: Fault Condition - Real-Time Heroku Infrastructure Data

_For any_ HTTP request to the `/infra` endpoint where Heroku Platform API is accessible and credentials are valid, the fixed endpoint SHALL return real-time infrastructure data fetched from Heroku, including all deployed apps, their dyno formations, regions, and current status, formatted according to the `InfraDetail` interface.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

Property 2: Preservation - Service Health Check Functionality

_For any_ functionality that is NOT related to the Infrastructure Stack table (service health checks, response time measurements, auto-refresh, manual refresh button, overall status banner), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing service monitoring capabilities.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `govnix-api-gateway/api/index.js`

**Function**: New `/infra` endpoint handler

**Specific Changes**:

1. **Add Heroku API Client Dependency**: Install `axios` or use existing HTTP client to make requests to Heroku Platform API
   - Add to package.json if not already present
   - Import in api/index.js

2. **Add Environment Variables**: Configure Heroku API credentials
   - Add `HEROKU_API_TOKEN` to `.env.example` and production environment
   - Document that this should be a Heroku OAuth token with read access to apps

3. **Implement `/infra` Endpoint**: Create new GET endpoint that fetches Heroku data
   - Endpoint path: `GET /infra`
   - Authentication: Should be public or use existing `requireAuth` middleware (needs clarification)
   - Response format: `{ data: InfraDetail[] }`

4. **Fetch Heroku Apps**: Query Heroku Platform API for all apps
   - Endpoint: `GET https://api.heroku.com/apps`
   - Headers: `Authorization: Bearer ${HEROKU_API_TOKEN}`, `Accept: application/vnd.heroku+json; version=3`

5. **Fetch Dyno Information**: For each app, get dyno details and formation
   - Endpoint: `GET https://api.heroku.com/apps/{app-id}/dynos`
   - Endpoint: `GET https://api.heroku.com/apps/{app-id}/formation`
   - Extract dyno types (web, worker), quantities, sizes

6. **Transform Data**: Map Heroku API response to InfraDetail format
   - `component`: App name (e.g., "cos-api-gateway")
   - `provider`: "Heroku"
   - `region`: App region from Heroku API (e.g., "us")
   - `type`: Dyno type (e.g., "Web", "Worker")
   - `typeColor`: Map dyno types to color scheme (web → indigo, worker → emerald, etc.)

7. **Error Handling**: Implement robust error handling
   - Handle Heroku API authentication failures
   - Handle rate limiting (Heroku API has rate limits)
   - Return graceful error response if Heroku API is unavailable
   - Log errors for debugging

8. **Caching (Optional but Recommended)**: Implement simple caching to reduce Heroku API calls
   - Cache infrastructure data for 30-60 seconds
   - Return cached data if available and not expired
   - This aligns with the frontend's 30-second auto-refresh

**File**: `govnix-api-gateway/.env.example`

**Changes**: Add Heroku API configuration section

```
# ─────────────────────────────────────────────
# Heroku Platform API Configuration (REQUIRED for /infra endpoint)
# ─────────────────────────────────────────────
# OAuth token for accessing Heroku Platform API
# Get from: https://dashboard.heroku.com/account/applications
# Requires read access to apps, dynos, and formations

HEROKU_API_TOKEN=your-heroku-oauth-token-here
```

**File**: `govnix-api-gateway/package.json`

**Changes**: Ensure axios is in dependencies (already present based on earlier analysis)

**File**: `govnix-admin/src/pages/PlatformMetrics.tsx`

**Changes**: None required - the component already makes the correct API call to `/infra` and handles the response properly. The bug is entirely backend-side.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code (endpoint returns null/static data), then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that call the `/infra` endpoint and assert that it returns real-time Heroku data. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:

1. **Endpoint Existence Test**: Call `GET /infra` endpoint (will fail with 404 on unfixed code if endpoint doesn't exist)
2. **Static Data Test**: Call `/infra` endpoint twice with 5-second delay, verify data changes if Heroku state changes (will fail on unfixed code if returning static data)
3. **Heroku API Integration Test**: Mock Heroku API, call `/infra`, verify it attempts to fetch from Heroku API (will fail on unfixed code if no integration exists)
4. **Data Format Test**: Call `/infra`, verify response matches `{ data: InfraDetail[] }` format with real Heroku fields (will fail on unfixed code if data is null or wrong format)

**Expected Counterexamples**:

- Endpoint returns 404 Not Found
- Endpoint returns null or empty data
- Endpoint returns hardcoded static data that never changes
- Endpoint doesn't attempt to call Heroku Platform API
- Possible causes: missing endpoint implementation, no Heroku API integration, missing credentials

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (requests to `/infra` endpoint), the fixed function produces the expected behavior (returns real-time Heroku data).

**Pseudocode:**

```
FOR ALL request WHERE isBugCondition(request) DO
  response := infraEndpoint_fixed(request)
  ASSERT response.data != null
  ASSERT response.data.length > 0
  ASSERT containsRealTimeDynoMetrics(response.data)
  ASSERT fetchedFromHeroku(response.data)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (service health checks, other API endpoints, UI interactions), the fixed function produces the same result as the original function.

**Pseudocode:**

```
FOR ALL request WHERE NOT isBugCondition(request) DO
  ASSERT originalBehavior(request) = fixedBehavior(request)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:

- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for service health checks and other functionality, then write property-based tests capturing that behavior.

**Test Cases**:

1. **Service Health Check Preservation**: Observe that health checks for API Gateway, Workflow Service, Database, and Document Storage work correctly on unfixed code, then write tests to verify this continues after fix
2. **Response Time Measurement Preservation**: Observe that response times are measured and displayed correctly on unfixed code, then write tests to verify this continues after fix
3. **Auto-Refresh Preservation**: Observe that 30-second auto-refresh works correctly on unfixed code, then write tests to verify this continues after fix
4. **Manual Refresh Button Preservation**: Observe that "Refresh Status" button triggers health checks on unfixed code, then write tests to verify this continues after fix
5. **Overall Status Banner Preservation**: Observe that status banner displays correctly based on service health on unfixed code, then write tests to verify this continues after fix

### Unit Tests

- Test `/infra` endpoint returns 200 status code
- Test `/infra` endpoint returns data in correct format `{ data: InfraDetail[] }`
- Test Heroku API authentication with valid token
- Test Heroku API authentication failure with invalid token
- Test data transformation from Heroku API format to InfraDetail format
- Test error handling when Heroku API is unavailable
- Test error handling when Heroku API rate limit is exceeded
- Test that service health check endpoints continue to work (`/health`, `/api/v1/workflows/templates`, etc.)
- Test that frontend correctly displays infrastructure data from `/infra` response

### Property-Based Tests

- Generate random Heroku API responses and verify transformation to InfraDetail format is correct
- Generate random app configurations (different numbers of apps, dyno types, regions) and verify all are correctly represented
- Generate random error scenarios (API timeouts, auth failures, malformed responses) and verify graceful error handling
- Test that all non-`/infra` endpoints continue to work across many request scenarios

### Integration Tests

- Test full flow: Frontend loads PlatformMetrics page → calls `/infra` → API Gateway fetches from Heroku → data displayed in UI
- Test refresh flow: User clicks "Refresh Status" → both service health checks AND infrastructure data update
- Test auto-refresh: Wait 30 seconds → verify both service health and infrastructure data refresh automatically
- Test with real Heroku API (in staging environment): Verify actual Heroku apps are fetched and displayed correctly
- Test with multiple Heroku apps: Verify all apps (cos-api-gateway, cos-workflow, cos-rules) are displayed with correct details
- Test error scenarios: Disconnect from Heroku API → verify graceful error message in UI
