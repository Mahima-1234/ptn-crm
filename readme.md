Leads Management & Global Search CRM

A highly optimized MERN stack application designed to handle datasets of 10,000+ records efficiently. The application implements true server-side pagination, sorting, filtering, and a debounced global search.

🏗️ Architecture & Approach

The project is split into a React frontend and an Express/MongoDB backend.
To ensure this runs perfectly in isolated preview environments, the React application (App.jsx) includes a built-in Mock Service Layer that intercepts API requests and replicates complex backend logic (sorting, regex filtering, pagination) entirely in memory without requiring a live node server.

State Management & Components

Centralized Query State: Pagination, sorting, and filtering states are maintained at the top level of the App component and fed into a memoized fetchLeads function.

Global Search: Treated as a completely distinct component with its own local state to prevent the main data grid from re-rendering as the user types into the global search bar.

⚡ Performance Optimizations

Frontend Optimizations

Debouncing (useDebounce hook): * Applied to both the Global Search (300ms) and the Grid Search (400ms). This prevents API spamming while the user is actively typing.

Request Cancellation (AbortController):

If a user types quickly or rapidly changes pages, previous inflight network requests are aborted via AbortSignal. This eliminates race conditions where an older request resolves after a newer one, ensuring UI consistency.

Strict Dependency Arrays & Memoization:

useCallback is used for fetchLeads to ensure the function reference doesn't change on every render, preventing continuous useEffect firing.

Network Simulation (In Mock):

The mock backend deliberately introduces a setTimeout delay to simulate latency, allowing us to accurately test loading overlays and UI behavior during network wait times.

Backend Optimizations (Node.js/MongoDB)

Aggregation Pipeline ($facet):

Instead of making two database calls (one for Lead.countDocuments() and one for Lead.find()), the /api/leads route uses a single $facet aggregation to perform pagination and total count retrieval in parallel.

Lean Queries (.lean()):

The Global Search endpoint uses Mongoose's .lean() method. By returning plain JavaScript objects instead of Mongoose Documents, we reduce memory footprint and CPU overhead by ~3-5x for read-only operations.

Database Indexing:

Compound text index on name, email, company for blazing fast text searches.

Single field indexes on status, owner, and createdAt to ensure sort operations happen in memory (IXSCAN) rather than requiring collection scans (COLLSCAN).

Projection:

The Global search explicitly limits returned fields via .select('name email company') to reduce network payload size.

🚀 Setup Instructions

To run the real Backend:

Copy server.js into a new folder.

Run npm init -y and npm install express mongoose cors dotenv.

Ensure MongoDB is running locally or provide a MONGO_URI environment variable.

Run node server.js.

To run the Frontend:

This file acts as a standalone React app. In a Vite setup, simply replace your App.jsx with the provided file.

Ensure you have lucide-react installed (npm install lucide-react).

To connect to the real backend instead of the mock data, set const USE_MOCK_API = false; at the top of the file.