# Bugfix Requirements Document

## Introduction

The PlatformMetrics page in the Admin Dashboard currently displays hardcoded/static infrastructure data instead of real-time metrics from Heroku. The page attempts to fetch infrastructure details from a `/infra` endpoint that either returns static data or is not properly implemented. This prevents administrators from monitoring actual platform health, resource utilization, and infrastructure status.

This bugfix will implement a complete dynamic revamp by:
- Creating a new `/infra` endpoint in the API Gateway that fetches real Heroku metrics
- Integrating with Heroku Platform API to retrieve comprehensive infrastructure data
- Displaying real-time metrics including dyno status, resource usage, app health, and detailed infrastructure information

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the PlatformMetrics page loads THEN the system displays static/hardcoded infrastructure stack data in the "Infrastructure Stack" table

1.2 WHEN the page attempts to fetch from `/infra` endpoint THEN the system either receives no data or static placeholder data that never changes

1.3 WHEN administrators view dyno metrics (CPU, memory usage) THEN the system shows no dyno-level resource utilization data

1.4 WHEN administrators view app-level metrics (request throughput, error rates) THEN the system shows no application performance metrics

1.5 WHEN administrators need to monitor multiple Heroku apps THEN the system shows no per-app breakdown or aggregated metrics

1.6 WHEN administrators refresh the page THEN the infrastructure data remains unchanged because it's not fetching real data

1.7 WHEN administrators need historical metrics or trends THEN the system provides no historical data or time-series information

### Expected Behavior (Correct)

2.1 WHEN the PlatformMetrics page loads THEN the system SHALL fetch and display real-time infrastructure data from Heroku Platform API

2.2 WHEN the page requests data from `/infra` endpoint THEN the system SHALL return current Heroku infrastructure details including all deployed apps, dynos, and their configurations

2.3 WHEN administrators view dyno metrics THEN the system SHALL display real-time CPU usage, memory consumption, and dyno status for each dyno

2.4 WHEN administrators view app-level metrics THEN the system SHALL display request throughput, response times, error rates, and other application performance indicators

2.5 WHEN administrators need to monitor multiple Heroku apps THEN the system SHALL display metrics for all Heroku apps in the infrastructure with clear per-app breakdowns

2.6 WHEN administrators refresh the page THEN the system SHALL fetch updated real-time data from Heroku showing current infrastructure state

2.7 WHEN administrators need detailed metrics THEN the system SHALL provide comprehensive data including dyno types, formation details, region information, and resource quotas

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the page checks service health endpoints (API Gateway, Workflow Service, Database, Document Storage) THEN the system SHALL CONTINUE TO perform health checks and display service status correctly

3.2 WHEN service health checks complete THEN the system SHALL CONTINUE TO show response times, status indicators (healthy/degraded/down), and last checked timestamps

3.3 WHEN the "Refresh Status" button is clicked THEN the system SHALL CONTINUE TO trigger health checks for all monitored services

3.4 WHEN the overall status banner displays THEN the system SHALL CONTINUE TO show "All Systems Operational" or degraded status based on service health

3.5 WHEN the page auto-refreshes every 30 seconds THEN the system SHALL CONTINUE TO automatically update service health status

3.6 WHEN authentication is required for API calls THEN the system SHALL CONTINUE TO use the existing authentication mechanism

3.7 WHEN the page layout and UI components render THEN the system SHALL CONTINUE TO maintain the current visual design, styling, and user experience
