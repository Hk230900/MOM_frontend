async function fetchWithAuth(url, options = {}) {
  // Ensure headers exist
  options.headers = options.headers || {};
  
  // Set content type to JSON if sending body and not already set
  if (options.body && !options.headers['Content-Type']) {
    options.headers['Content-Type'] = 'application/json';
  }

  // Get token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('mom_access_token') : null;
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, options);

  // If unauthorized, try to refresh token
  if (response.status === 401 && typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('mom_refresh_token');
    if (refreshToken) {
      try {
        const refreshUrl = process.env.NEXT_PUBLIC_URLTOKENREFRESH || 'http://localhost:8000/api/token/refresh/';
        const refreshResponse = await fetch(refreshUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          localStorage.setItem('mom_access_token', data.access);
          
          // Retry the request with the new token
          options.headers['Authorization'] = `Bearer ${data.access}`;
          response = await fetch(url, options);
        } else {
          // Refresh token expired or invalid, log out
          localStorage.removeItem('mom_access_token');
          localStorage.removeItem('mom_refresh_token');
          window.location.href = '/login';
        }
      } catch (err) {
        console.error("Token refresh failed:", err);
      }
    }
  }

  return response;
}

export const api = {
  get: async (url, options = {}) => {
    const res = await fetchWithAuth(url, { ...options, method: 'GET' });
    if (!res.ok) throw new Error(`GET query failed with status ${res.status}`);
    return res.json();
  },
  post: async (url, body, options = {}) => {
    const res = await fetchWithAuth(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const err = new Error(`POST query failed with status ${res.status}`);
      err.details = errorData;
      throw err;
    }
    return res.json();
  },
  put: async (url, body, options = {}) => {
    const res = await fetchWithAuth(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const err = new Error(`PUT query failed with status ${res.status}`);
      err.details = errorData;
      throw err;
    }
    return res.json();
  },
  delete: async (url, options = {}) => {
    const res = await fetchWithAuth(url, { ...options, method: 'DELETE' });
    if (!res.ok) throw new Error(`DELETE query failed with status ${res.status}`);
    return res;
  },
  login: async (username, password) => {
    const tokenUrl = process.env.NEXT_PUBLIC_URLTOKEN || 'http://localhost:8000/api/token/';
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const err = new Error("Invalid username or password");
      err.details = errorData;
      throw err;
    }
    const data = await res.json();
    localStorage.setItem('mom_access_token', data.access);
    localStorage.setItem('mom_refresh_token', data.refresh);
    localStorage.setItem('mom_username', data.username || username);
    localStorage.setItem('mom_user_role', data.role || 'Standard');
    return data;
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mom_access_token');
      localStorage.removeItem('mom_refresh_token');
      localStorage.removeItem('mom_username');
      localStorage.removeItem('mom_user_role');
      window.location.href = '/login';
    }
  },
  isAuthenticated: () => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('mom_access_token');
  },
  getUsername: () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('mom_username') || '';
  },
  isAdmin: () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('mom_user_role') === 'Admin';
  },
  getUserRole: () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('mom_user_role') || 'Standard';
  }
};
