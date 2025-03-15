# FitFlow - Modern Fitness Tracking App

<p align="center">
  <img src="https://via.placeholder.com/150" alt="FitFlow Logo" width="150" height="150">
</p>

**Tech Stack:** Next.js 14, Supabase, TypeScript, Tailwind CSS, NextUI, ShadCN UI, Recharts

## Project Overview

FitFlow is a full-stack web application that helps users track their fitness progress. It demonstrates implementation of authentication flows, complex data relationships, analytics visualization, and responsive UI design.

### Key Features

- **Authentication & User Management** - Email/password login, user settings, account management
- **Workout Tracking System** - Create, log, and track workout sessions with exercises, sets and reps
- **Exercise Library** - Searchable database with custom exercise creation
- **Analytics Dashboard** - Interactive charts showing weight/volume progression and PRs
- **Responsive Design** - Optimized for both desktop and mobile use

<p align="center">
  <img src="https://via.placeholder.com/800x400" alt="FitFlow Dashboard" width="800">
</p>

## Technical Highlights

- **Server Components** - Leverages Next.js 14 App Router architecture
- **Database Design** - Complex relational data model with RLS security policies
- **State Management** - Custom hooks for data fetching and state synchronization
- **API Integration** - Server actions for secure backend operations
- **UI/UX Design** - Modern component library implementation with consistent design system

## Quick Start

```bash
# Clone and install
git clone https://github.com/yourusername/fitflow.git
cd fitflow
npm install

# Configure environment
cp .env.example [.env.local](http://_vscodecontentref_/0)
# Add your Supabase credentials to [.env.local](http://_vscodecontentref_/1)

# Run development server
npm run dev
```

## Areas for Future Development

- Mobile app version
- Workout recommendation engine
- Social features for sharing workouts
