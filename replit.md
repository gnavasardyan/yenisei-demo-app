# Overview

This is a task management web application built with a React frontend and Express backend. The system provides a comprehensive interface for managing tasks and users, including task assignment, file attachments, and user administration. The application acts as a proxy to an external API (qdr.equiron.com) while maintaining a modern, responsive user interface built with shadcn/ui components and Tailwind CSS.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/build tooling
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation schemas
- **File Uploads**: Uppy library for file upload handling

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Proxy Pattern**: All API requests are forwarded to external backend at qdr.equiron.com
- **Development Server**: Integrated Vite development server with HMR support
- **Error Handling**: Centralized error handling middleware
- **Logging**: Request/response logging for API endpoints

## Data Layer
- **Database ORM**: Drizzle ORM configured for PostgreSQL
- **Schema Management**: Shared schema definitions between frontend and backend
- **Type Safety**: Full TypeScript integration with Zod schemas for validation
- **Database Provider**: Configured for Neon Database (serverless PostgreSQL)

## Key Design Patterns
- **Proxy Architecture**: Backend serves as API proxy to external services
- **Shared Types**: Common type definitions shared between client and server
- **Component Composition**: Reusable UI components with consistent styling
- **Query-based State**: Server state managed through React Query patterns
- **Form Validation**: Schema-driven validation using Zod

## Application Structure
- **Tasks Management**: Full CRUD operations, status tracking, user assignment
- **User Management**: User creation, editing, and task association
- **File Attachments**: Task file upload capabilities
- **Dashboard**: Overview statistics and recent activity
- **Responsive Design**: Mobile-first responsive layout with sidebar navigation

# External Dependencies

## Core Infrastructure
- **External API**: qdr.equiron.com (primary data source)
- **Database**: Neon Database (PostgreSQL) via @neondatabase/serverless
- **File Storage**: AWS S3 integration via Uppy

## Development Tools
- **Build System**: Vite with TypeScript support
- **Code Quality**: ESLint, TypeScript compiler
- **Development**: Replit-specific plugins for development environment

## UI/UX Libraries
- **Component Library**: Radix UI primitives with shadcn/ui styling
- **Icons**: Lucide React icon library
- **Styling**: Tailwind CSS with PostCSS processing
- **File Uploads**: Uppy core with AWS S3 and dashboard plugins

## Backend Services
- **Database ORM**: Drizzle with PostgreSQL dialect
- **Session Management**: connect-pg-simple for PostgreSQL session store
- **Validation**: Zod for runtime type checking and validation