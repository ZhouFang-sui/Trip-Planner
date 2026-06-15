# 🗺️ Trip Planner

A collaborative web application for multi-user synchronized trip planning.

## Overview

Trip Planner enables users to:
- Plan trips together in real-time with **Live Cursors** and **Team Chat**
- View and manage routes on interactive maps (Google Maps)
- Create daily itineraries with time and location details
- Track attractions and highlights with AI assistance
- Manage transportation methods, flights, and tickets
- Organize important documents and files
- Split expenses and manage budgets in multiple currencies
- Get AI-assisted planning suggestions via **Floating AI Chat**

## Core Features

1. **Map Functionality** - Google Maps integration with route planning, waypoint management, and live distance/duration metrics.
2. **Daily Itinerary** - Schedule tables with time, location, and drag-and-drop themes.
3. **Attractions & Highlights** - Track must-see places, Wikipedia integration, and nearby famous sites.
4. **Transportation & Flights** - Mode selection (driving, transit, walking, bicycling) and flight ticket management.
5. **Document Folder** - Upload and store tickets, PDFs, and important files.
6. **Expense Splitting** - Track shared costs, manage budgets, and convert currencies.
7. **Real-time Collaboration** - See where your friends are pointing with live cursors and chat together.
8. **AI Chat Assistant** - Floating AI assistant that analyzes routes and suggests optimizing strategies.

## Tech Stack

- **Frontend**: React 18, Next.js 14, TypeScript
- **Backend**: Python, FastAPI, Uvicorn
- **Maps**: Google Maps API, Nominatim (Fallback)
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Linting**: ESLint, TypeScript Type-Checking

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Python >= 3.8

### Installation

#### 1. Frontend Setup
```bash
# Clone the repository
git clone https://github.com/ZhouFang-sui/Trip-Planner.git
cd Trip-Planner

# Install frontend dependencies
npm install

# Create environment file
cp .env.example .env.local

# Add your API keys to .env.local
# - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
# - NEXT_PUBLIC_API_URL (default: http://localhost:8000)
```

#### 2. Python Backend Setup
Ensure you have Python installed, then run:
```bash
# Install backend dependencies
pip install -r python_backend/requirements.txt

# Create environment file for Python
# Make sure to add GEMINI_API_KEY inside python_backend/.env
```

### Running the Application

To run the full application, you need to start **both** servers. We provide a single script to start both concurrently:

```bash
# Start both Frontend and Python Backend concurrently
npm run dev:all
```
*Frontend runs at `http://localhost:3000` and Backend API at `http://localhost:8000`.*

Alternatively, run them separately:
- **Frontend**: `npm run dev`
- **Backend**: `cd python_backend && python -m uvicorn main:app --reload --port 8000`

### Building for Production

```bash
# Build the Next.js app
npm run build

# Start the production server
npm start
```

### Type Checking & Linting

```bash
# Run TypeScript type check
npm run type-check

# Run ESLint to check for code issues
npm run lint
```

## Project Structure

```text
Trip-Planner/
├── python_backend/       # Python FastAPI backend for AI and data processing
│   ├── main.py           # FastAPI application entry point
│   └── requirements.txt  # Python dependencies
├── src/
│   ├── app/              # Next.js App Router (Pages, Layouts)
│   ├── components/       # Reusable React components (Map, Chat, Expense, Document, etc.)
│   ├── context/          # React Context providers (LangContext)
│   ├── store/            # Zustand state management
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript type definitions
│   └── styles/           # Global styles & Tailwind
├── public/               # Static assets
├── .env.example          # Environment variables template
├── next.config.js        # Next.js configuration
├── tailwind.config.ts    # Tailwind CSS configuration
├── package.json          # Project scripts and Node dependencies
└── README.md             # This file
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run lint` and `npm run type-check` before committing
4. Submit a pull request

## License

MIT
