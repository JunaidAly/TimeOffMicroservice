# Time-Off Microservice

A robust NestJS microservice for managing time-off requests while maintaining strict balance integrity between ExampleHR and the external Human Capital Management (HCM) system.

## Problem Statement

ExampleHR serves as the primary interface for employees to request time off. However, the **HCM system** (like Workday or SAP) remains the **"Source of Truth"** for employment data and time-off balances.

**Core Challenge**:  
Keeping balances synchronized is difficult because:
- Employees request time off in ExampleHR
- HCM can update balances independently (work anniversary bonuses, yearly refreshes, etc.)
- We must ensure HCM agrees with every request and provide accurate balances to employees and managers

**User Needs**:
- **Employee**: Accurate balance + instant feedback on requests
- **Manager**: Approve requests with confidence that data is valid

## Features

- Complete lifecycle management of time-off requests (create, view, approve, reject)
- Defensive synchronization with HCM (real-time + batch)
- Per-employee, per-location balance tracking
- Robust error handling and balance integrity protection
- Realistic HCM mock servers for testing

## Tech Stack

- **Backend**: NestJS (TypeScript)
- **Database**: SQLite
- **ORM**: TypeORM
- **Testing**: Jest + Supertest + Mock servers
- **Architecture**: Modular, Clean Architecture

## Quick Start

### 1. Installation

```bash
git clone <your-repository-url>
cd time-off-microservice

npm install

cp .env.example .env
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod
# All tests
npm run test

# E2E tests (with HCM mocks)
npm run test:e2e

# Coverage
npm run test:cov

src/
├── common/             # Global filters, interceptors, pipes
├── config/
├── database/           # SQLite configuration
├── modules/
│   ├── time-off/       # Main time-off requests module
│   └── hcm/            # HCM integration & sync logic
├── entities/           # TypeORM entities
├── dto/                # Request/Response DTOs
├── controllers/
├── services/
└── tests/              # Test utilities & HCM mocks

