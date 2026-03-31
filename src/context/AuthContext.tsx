"use client";

import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { UserRole } from "@/types";

interface AuthContextValue {
  user: User | null;
  role: UserRole;
  loading: boolean;
  logout: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const defaultRole: UserRole = "guest";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(
    async (uid: string) => {
      if (!db) {
        setRole(defaultRole);
        return;
      }
      try {
        const snapshot = await getDoc(doc(db, "users", uid));
        if (snapshot.exists()) {
          const data = snapshot.data() as { role?: UserRole };
          if (data.role) {
            setRole(data.role);
            return;
          }
        }
        setRole(defaultRole);
      } catch (err) {
        console.warn("Unable to load role", err);
        setRole(defaultRole);
      }
    },
    []
  );

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return () => undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (nextUser?.uid) {
        fetchRole(nextUser.uid).finally(() => setLoading(false));
      } else {
        setRole(defaultRole);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchRole]);

  const logout = useCallback(async () => {
    if (auth) {
      await signOut(auth);
    }
    setRole(defaultRole);
  }, []);

  const value = useMemo(
    () => ({
      user,
      role,
      loading,
      logout,
      refreshRole: async () => {
        if (user?.uid && db) {
          await fetchRole(user.uid);
        }
      }
    }),
    [user, role, loading, logout, fetchRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
