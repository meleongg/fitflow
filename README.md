# FitFlow - Modern Fitness Tracking App

<p align="center">
  <img width="734" alt="image" src="https://github.com/user-attachments/assets/2f61d4a9-d13f-46d4-b12b-8d721a80dc7e" />
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

<img width="1063" alt="image" src="https://github.com/user-attachments/assets/525c3a65-a16c-4973-ae46-2900c2aac8ba" />

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
