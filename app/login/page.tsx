"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut, UserCredential } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, isFirebaseReady } from "@/lib/firebase";
import styles from "@/styles/login.module.css";
import { UserRole } from "@/types";

const roles: UserRole[] = ["guest", "staff", "admin"];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<UserRole>("guest");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!auth || !db) {
        throw new Error("Firebase is not configured. Set environment variables first.");
      }
      let credential: UserCredential;
      if (mode === "signup") {
        credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: role.toUpperCase() });
        await setDoc(doc(db, "users", credential.user.uid), {
          role,
          email,
          createdAt: new Date().toISOString()
        });
      } else {
        credential = await signInWithEmailAndPassword(auth, email, password);
      }

      const user = credential.user;
      let firestoreRole: UserRole | undefined;

      if (mode === "signup") {
        firestoreRole = role;
      } else {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          throw new Error("User role record not found. Contact an administrator.");
        }
        firestoreRole = userDoc.data()?.role as UserRole | undefined;
        if (!firestoreRole) {
          throw new Error("User role missing on account. Contact an administrator.");
        }
        if (firestoreRole !== role) {
          setError(`This account is registered as ${firestoreRole.toUpperCase()}. Please select the correct role.`);
          await signOut(auth);
          return;
        }
      }

      if (!firestoreRole) {
        throw new Error("Unable to determine role for this account.");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("role", firestoreRole);
      }
      console.log("Selected role:", role, "Firestore role:", firestoreRole);
      if (firestoreRole === "staff") {
        router.replace("/staff");
      } else if (firestoreRole === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to authenticate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.shell}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1>{mode === "login" ? "Welcome back" : "Create secure access"}</h1>
        <p>Select your role and enter credentials to continue.</p>
        {!isFirebaseReady && (
          <p className={styles.error}>Firebase environment variables are missing.</p>
        )}

        <div className={styles.toggleWrap}>
          {roles.map((r) => (
            <button
              key={r}
              type="button"
              className={role === r ? styles.roleActive : styles.role}
              onClick={() => setRole(r)}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>

        <label>
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          <span>Password</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>

        <button className={styles.submit} disabled={loading || !isFirebaseReady}>
          {loading ? "Securing access..." : mode === "login" ? "Log In" : "Sign Up"}
        </button>

        {error && <p className={styles.error}>{error}</p>}

        <button
          className={styles.modeSwitch}
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Need an account?" : "Have an account?"}
        </button>
      </form>
    </main>
  );
}
