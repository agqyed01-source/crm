import React, { createContext, useContext, useEffect, useState } from 'react';

export type UserRole = 'admin' | 'manager' | 'sales' | null;

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  loginWithEmail: async () => {},
  signupWithEmail: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.user) {
        setUser(data.user);
        setRole(data.user.role);
      } else {
        localStorage.removeItem('token');
      }
    })
    .catch(() => localStorage.removeItem('token'))
    .finally(() => setLoading(false));
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    const url = '/api/auth/login';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    
    let data;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      throw new Error(`Server error: ${res.status} ${res.statusText}\nURL: ${new URL(url, window.location.href).href}\n${text.substring(0, 100)}`);
    }

    if (!res.ok) throw new Error(data.error || 'Login failed');
    
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setRole(data.user.role);
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    const url = '/api/auth/register';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, name })
    });
    
    let data;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      throw new Error(`Server error: ${res.status} ${res.statusText}\nURL: ${new URL(url, window.location.href).href}\n${text.substring(0, 100)}`);
    }

    if (!res.ok) throw new Error(data.error || 'Registration failed');
    
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setRole(data.user.role);
  };

  const logout = async () => {
    localStorage.removeItem('token');
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, loginWithEmail, signupWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
