# ValidaFornecedor - Supplier Validation Platform

## Overview

ValidaFornecedor is a comprehensive supplier validation platform that uses AI-powered analysis to evaluate Brazilian companies through CNPJ validation. The system provides detailed risk assessments, scoring, and reporting capabilities for supplier due diligence. Built as a full-stack web application with React frontend and Express backend, it integrates with external APIs to gather comprehensive company data and generate detailed validation reports.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: React Query (TanStack Query) for server state management and caching
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation schemas

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful API structure with middleware-based request handling
- **Error Handling**: Centralized error handling with structured error responses

### Data Storage
- **Database**: PostgreSQL with Neon serverless configuration
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Code-first approach with migrations in dedicated folder
- **Session Storage**: PostgreSQL-based session storage for authentication persistence

### Authentication and Authorization
- **Provider**: Replit Auth integration using OpenID Connect
- **Session Management**: Server-side sessions with secure cookies
- **API Protection**: Middleware-based authentication checks for protected routes
- **User Management**: Complete user lifecycle with profile management and usage tracking

### Business Logic Services
- **CNPJ Service**: Integration with external APIs for company data retrieval and validation
- **Scoring Service**: Risk assessment algorithm with weighted scoring across multiple criteria
- **Report Service**: PDF generation and data export capabilities
- **Storage Service**: Abstracted data access layer for all database operations

### UI/UX Design
- **Design System**: Consistent component library based on Radix primitives
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Accessibility**: Built-in accessibility features through Radix components
- **Dark Mode**: CSS variable-based theming system ready for dark mode implementation

## External Dependencies

### Database and Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Replit Platform**: Development and deployment environment with built-in authentication

### CNPJ Validation APIs
- **DataSutra API**: Primary source for Brazilian company data and CNPJ validation
- **Fallback APIs**: Multiple backup services for reliability (Kriptos, custom endpoints)
- **Rate Limiting**: Built-in usage tracking and API quota management

### UI and Styling
- **Radix UI**: Comprehensive set of unstyled, accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework for rapid styling
- **Lucide Icons**: Modern icon library for consistent iconography

### Development and Build Tools
- **Vite**: Fast build tool with hot module replacement for development
- **TypeScript**: Type safety across the entire application stack
- **ESLint/Prettier**: Code quality and formatting tools
- **Cartographer**: Replit-specific development tools for enhanced debugging

### Third-party Integrations
- **PDF Generation**: Planned integration with Puppeteer or similar for report generation
- **Analytics**: Built-in usage tracking and metrics collection
- **Email Services**: Planned integration for notifications and reports