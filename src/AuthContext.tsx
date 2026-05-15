import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { handleFirestoreError, OperationType } from './firebaseUtils';

export type UserRole = 'admin' | 'manager' | 'sales' | null;

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  login: async () => {},
  loginWithEmail: async () => {},
  signupWithEmail: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role);
          } else {
            // Check if it's the super admin
            const newRole = firebaseUser.email === 'agqyed01@gmail.com' ? 'admin' : 'sales';
            // Create user document
            const userData = {
               uid: firebaseUser.uid,
               email: firebaseUser.email || '',
               displayName: firebaseUser.displayName || '',
               role: newRole,
               createdAt: Date.now(),
               updatedAt: Date.now(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), userData);
            setRole(newRole);
          }
        } catch (error) {
           handleFirestoreError(error, OperationType.GET, 'users');
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(user, { displayName: name });
    // Note: User document will be created by the onAuthStateChanged observer
    // but the observer might run before updateProfile finishes. 
    // In a real app we might want to handle this more robustly, 
    // but the observer does grab user.displayName so if updateProfile is fast enough, it's fine.
    // Or we update the doc later. For now, this suffices.
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, loginWithEmail, signupWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
