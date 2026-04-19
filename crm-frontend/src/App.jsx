import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, 
  Filter, Building2, Mail, User, Clock, AlertCircle, CheckCircle2 
} from 'lucide-react';

// ==========================================
// CONFIGURATION & MOCK BACKEND
// ==========================================
// Set to false to use the real Node.js backend (server.js)
const USE_MOCK_API = false; 
const API_BASE_URL = 'http://localhost:5000/api';

// --- MOCK DATA GENERATOR (Simulating 10,000+ DB Records) ---
const generateMockData = () => {
  const statuses = ['New', 'Contacted', 'Qualified', 'Lost', 'Won'];
  const owners = ['Alice Smith', 'Bob Johnson', 'Charlie Davis', 'Diana Prince', 'Evan Wright'];
  const companies = ['TechCorp', 'GlobalNet', 'Innova', 'Synergy', 'Apex Solutions', 'Nexus', 'Quantum'];
  const fNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda'];
  const lNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  
  const data = [];
  for (let i = 1; i <= 10000; i++) {
    const fName = fNames[Math.floor(Math.random() * fNames.length)];
    const lName = lNames[Math.floor(Math.random() * lNames.length)];
    data.push({
      _id: `lead_${i}`,
      name: `${fName} ${lName}`,
      email: `${fName.toLowerCase()}.${lName.toLowerCase()}${i}@example.com`,
      company: companies[Math.floor(Math.random() * companies.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      owner: owners[Math.floor(Math.random() * owners.length)],
      createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
    });
  }
  return data;
};

const MOCK_DB = generateMockData();

// --- MOCK API SERVICE ---
const mockFetch = async (endpoint, options = {}) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const url = new URL(`http://localhost${endpoint}`);
      const params = Object.fromEntries(url.searchParams.entries());
      
      let results = [...MOCK_DB];

      // 1. Filtering
      if (params.status) results = results.filter(r => r.status === params.status);
      if (params.owner) results = results.filter(r => r.owner === params.owner);
      
      // 2. Searching
      if (params.search) {
        const query = params.search.toLowerCase();
        results = results.filter(r => 
          r.name.toLowerCase().includes(query) ||
          r.email.toLowerCase().includes(query) ||
          r.company.toLowerCase().includes(query)
        );
      }

      // 3. Sorting
      if (params.sortBy) {
        const order = params.sortOrder === 'desc' ? -1 : 1;
        results.sort((a, b) => {
          if (a[params.sortBy] < b[params.sortBy]) return -1 * order;
          if (a[params.sortBy] > b[params.sortBy]) return 1 * order;
          return 0;
        });
      }

      // 4. Pagination & Limits
      const total = results.length;
      const page = parseInt(params.page) || 1;
      const limit = parseInt(params.limit) || 10;
      const startIndex = (page - 1) * limit;
      
      if (endpoint.includes('/leads/search')) {
        // Global search specific
        resolve({ data: results.slice(0, limit) });
      } else {
        // Grid specific
        resolve({ data: results.slice(startIndex, startIndex + limit), total, page, totalPages: Math.ceil(total / limit) });
      }
    }, 400); // Simulate network latency
  });
};

// ==========================================
// UTILITY HOOKS
// ==========================================
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ==========================================
// COMPONENTS
// ==========================================

// --- Global Search Component ---
const GlobalSearch = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const url = `/leads/search?search=${encodeURIComponent(debouncedQuery)}&limit=10`;
        const res = USE_MOCK_API ? await mockFetch(url) : await fetch(`${API_BASE_URL}${url}`).then(r => r.json());
        setResults(res.data || []);
        setIsOpen(true);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSearchResults();
  }, [debouncedQuery]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2.5 border border-transparent rounded-full leading-5 bg-gray-100 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm transition-all shadow-inner"
          placeholder="Global Search (Leads, Emails, Companies)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if(results.length > 0) setIsOpen(true) }}
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="absolute z-20 mt-2 w-full bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] max-h-80 rounded-xl py-2 text-base ring-1 ring-gray-100 overflow-auto focus:outline-none sm:text-sm transition-all">
          {results.map((lead) => (
            <li
              key={lead._id}
              className="cursor-pointer select-none relative py-3 pl-4 pr-9 hover:bg-indigo-50/50 transition-colors border-b border-gray-50 last:border-0"
              onClick={() => {
                onSelect(lead);
                setIsOpen(false);
                setQuery('');
              }}
            >
              <div className="flex flex-col">
                <span className="font-medium text-slate-900 truncate">{lead.name}</span>
                <span className="text-slate-500 text-xs truncate flex items-center gap-1 mt-1">
                  <Building2 className="w-3 h-3" /> {lead.company} • <Mail className="w-3 h-3" /> {lead.email}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// --- Main Application ---
export default function App() {
  // State: Pagination & Sorting
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // State: Filters
  const [search, setSearch] = useState('');
  const debouncedGridSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');

  // State: Data
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ref for AbortController to cancel stale requests
  const abortControllerRef = useRef(null);

  // Fetch Data function (Memoized to prevent recreation)
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const params = new URLSearchParams({
        page, limit, sortBy, sortOrder,
        ...(debouncedGridSearch && { search: debouncedGridSearch }),
        ...(statusFilter && { status: statusFilter }),
        ...(ownerFilter && { owner: ownerFilter }),
      });

      let resData;
      if (USE_MOCK_API) {
        resData = await mockFetch(`/leads?${params.toString()}`);
      } else {
        const response = await fetch(`${API_BASE_URL}/leads?${params.toString()}`, {
          signal: abortControllerRef.current.signal
        });
        if (!response.ok) throw new Error('Network response was not ok');
        resData = await response.json();
      }

      setData(resData.data);
      setTotal(resData.total);
    } catch (err) {
      if (err.name !== 'AbortError') setError('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, debouncedGridSearch, statusFilter, ownerFilter]);

  // Trigger fetch when dependencies change
  useEffect(() => {
    fetchLeads();
    return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
  }, [fetchLeads]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedGridSearch, statusFilter, ownerFilter]);

  // Sort Handler
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (column) => {
    if (sortBy !== column) return <span className="w-4 h-4 inline-block opacity-0 group-hover:opacity-40 transition-opacity"><ChevronUp /></span>;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 inline-block text-indigo-600" /> : <ChevronDown className="w-4 h-4 inline-block text-indigo-600" />;
  };

  // Status Badge styling
  const getStatusColor = (status) => {
    switch(status) {
      case 'New': return 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20';
      case 'Contacted': return 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20';
      case 'Qualified': return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20';
      case 'Won': return 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20';
      case 'Lost': return 'bg-red-50 text-red-700 ring-1 ring-red-600/20';
      default: return 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-800 font-sans">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-sm text-white">
                <Building2 className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-900 to-violet-800 tracking-tight">Nexus CRM</h1>
            </div>
            <div className="flex-1 flex justify-end px-2 lg:ml-6">
              <GlobalSearch onSelect={(lead) => alert(`Navigating to Lead: ${lead.name}`)} />
            </div>
            <div className="flex items-center ml-4">
              <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold ring-2 ring-white shadow-sm">
                AD
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Leads Management</h2>
            <p className="text-sm text-gray-500 mt-1">Manage and track your active leads globally. Database size: ~10,000</p>
          </div>
          
          {/* GRID FILTERS */}
          <div className="flex flex-wrap gap-3 items-center">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter grid..."
                  className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64 bg-white shadow-sm transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
             <select 
               className="border border-gray-200 rounded-xl text-sm px-4 py-2.5 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none cursor-pointer transition-all"
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
             >
               <option value="">All Statuses</option>
               <option value="New">New</option>
               <option value="Contacted">Contacted</option>
               <option value="Qualified">Qualified</option>
               <option value="Won">Won</option>
               <option value="Lost">Lost</option>
             </select>
             
             <select 
               className="border border-gray-200 rounded-xl text-sm px-4 py-2.5 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none cursor-pointer transition-all"
               value={ownerFilter}
               onChange={(e) => setOwnerFilter(e.target.value)}
             >
               <option value="">All Owners</option>
               <option value="Alice Smith">Alice Smith</option>
               <option value="Bob Johnson">Bob Johnson</option>
               <option value="Charlie Davis">Charlie Davis</option>
               <option value="Diana Prince">Diana Prince</option>
               <option value="Evan Wright">Evan Wright</option>
             </select>
          </div>
        </div>

        {/* DATA GRID */}
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden relative">
          
          {/* Loading Overlay */}
          {loading && (
             <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
               <div className="bg-white px-4 py-3 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex items-center gap-3 text-sm font-medium text-indigo-700">
                  <div className="animate-spin h-5 w-5 border-2 border-indigo-600 rounded-full border-t-transparent"></div>
                  Loading Data...
               </div>
             </div>
          )}

          <div className="overflow-x-auto min-h-[500px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  {['name', 'email', 'company', 'status', 'owner', 'createdAt'].map((col) => (
                    <th 
                      key={col}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer group hover:bg-gray-100/50 transition-colors select-none"
                      onClick={() => handleSort(col)}
                    >
                      <div className="flex items-center gap-1">
                        {col === 'createdAt' ? 'Created Date' : col}
                        {renderSortIcon(col)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {error ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-red-500 flex flex-col items-center">
                      <AlertCircle className="h-8 w-8 mb-2" />
                      {error}
                    </td>
                  </tr>
                ) : data.length === 0 && !loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400 flex flex-col items-center">
                      <Filter className="h-8 w-8 mb-2 text-gray-300" />
                      No leads found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  data.map((lead) => (
                    <tr key={lead._id} className="hover:bg-indigo-50/30 transition-colors border-b border-gray-50 last:border-none group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold text-xs mr-3 ring-1 ring-indigo-100 group-hover:bg-indigo-100 transition-colors">
                            {lead.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                          {lead.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                          {lead.company}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                          {lead.owner}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="bg-white px-6 py-4 border-t border-gray-100 flex items-center justify-between sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Showing <span className="font-medium text-gray-900">{(page - 1) * limit + (total === 0 ? 0 : 1)}</span> to <span className="font-medium text-gray-900">{Math.min(page * limit, total)}</span> of <span className="font-medium text-gray-900">{total}</span> results
                </p>
              </div>
              <div className="flex items-center gap-6">
                {/* Items per page */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Rows per page:</span>
                  <select
                    className="border border-gray-200 rounded-lg text-sm px-2 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all hover:bg-gray-100"
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>

                <nav className="relative z-0 inline-flex items-center gap-2" aria-label="Pagination">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <div className="px-4 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm font-medium text-gray-700">
                    Page {page} of {Math.ceil(total / limit) || 1}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                    disabled={page >= Math.ceil(total / limit) || total === 0}
                    className="relative inline-flex items-center px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}