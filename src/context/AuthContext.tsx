import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider, getFirebaseErrorMessage } from '../lib/firebase.js';
import { User, StoreSettings } from '../types.js';
import {
  getUserProfile,
  saveUserProfile,
  getStoreSettings,
  updateStoreSettings,
  seedStarterProductsIfEmpty,
} from '../services/firestoreService.js';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  settings: StoreSettings | null;
  loading: boolean;
  isAuthenticated: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (fullName: string, email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync Firebase user profile and store settings
  const syncUserData = async (fbUser: FirebaseUser): Promise<User> => {
    try {
      let profile = await getUserProfile(fbUser.uid);

      if (!profile) {
        // Automatically create Firestore user profile on first login
        profile = await saveUserProfile(fbUser.uid, {
          userId: fbUser.uid,
          fullName: fbUser.displayName || 'Shopkeeper',
          email: fbUser.email || '',
          profilePhoto: fbUser.photoURL || null,
          storeName: 'My Kirana Store',
        });
      }

      // Load store settings
      const storeSettings = await getStoreSettings(fbUser.uid);

      // Seed starter products if store is empty (non-blocking)
      seedStarterProductsIfEmpty(fbUser.uid).catch((seedErr) => {
        console.warn('Non-critical starter product seeding warning:', seedErr);
      });

      const appUser: User = {
        id: fbUser.uid,
        userId: fbUser.uid,
        name: profile.fullName || fbUser.displayName || 'Shopkeeper',
        fullName: profile.fullName || fbUser.displayName || 'Shopkeeper',
        email: profile.email || fbUser.email || '',
        profilePhoto: profile.profilePhoto || fbUser.photoURL || null,
        phone: profile.phone || '',
        storeName: profile.storeName || storeSettings.storeName || 'My Kirana Store',
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      };

      setUser(appUser);
      setSettings(storeSettings);
      return appUser;
    } catch (err) {
      console.error('Failed to sync user data from Firestore:', err);
      // Fallback to basic profile so user is NEVER blocked from Dashboard
      const fallbackUser: User = {
        id: fbUser.uid,
        userId: fbUser.uid,
        name: fbUser.displayName || 'Shopkeeper',
        fullName: fbUser.displayName || 'Shopkeeper',
        email: fbUser.email || '',
        profilePhoto: fbUser.photoURL || null,
        storeName: 'My Kirana Store',
      };
      setUser((prev) => prev || fallbackUser);
      return fallbackUser;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentFbUser) => {
      if (currentFbUser) {
        setFirebaseUser(currentFbUser);
        const baseUser: User = {
          id: currentFbUser.uid,
          userId: currentFbUser.uid,
          name: currentFbUser.displayName || 'Shopkeeper',
          fullName: currentFbUser.displayName || 'Shopkeeper',
          email: currentFbUser.email || '',
          profilePhoto: currentFbUser.photoURL || null,
          storeName: 'My Kirana Store',
        };
        setUser((prev) => (prev && prev.userId === currentFbUser.uid ? prev : baseUser));

        try {
          await syncUserData(currentFbUser);
        } catch (syncErr) {
          console.warn('Initial user profile sync warning:', syncErr);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        setSettings(null);
      }

      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 1. Email & Password Login
  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      setFirebaseUser(cred.user);
      const baseUser: User = {
        id: cred.user.uid,
        userId: cred.user.uid,
        name: cred.user.displayName || 'Shopkeeper',
        fullName: cred.user.displayName || 'Shopkeeper',
        email: cred.user.email || '',
        profilePhoto: cred.user.photoURL || null,
        storeName: 'My Kirana Store',
      };
      setUser((prev) => (prev && prev.userId === cred.user.uid ? prev : baseUser));

      // Asynchronously load or create profile without blocking Dashboard access
      syncUserData(cred.user).catch((syncErr) => {
        console.warn('Non-blocking user sync on email login:', syncErr);
      });
    } catch (err: any) {
      throw new Error(getFirebaseErrorMessage(err));
    }
  };

  // 2. Email & Password Sign Up
  const signUpWithEmail = async (fullName: string, email: string, pass: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);

      // Set displayName on Firebase auth user
      try {
        await updateProfile(cred.user, { displayName: fullName.trim() });
      } catch (profileErr) {
        console.warn('Could not update Firebase display name:', profileErr);
      }

      setFirebaseUser(cred.user);
      const initialUser: User = {
        id: cred.user.uid,
        userId: cred.user.uid,
        name: fullName.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        profilePhoto: null,
        storeName: 'My Kirana Store',
      };
      setUser(initialUser);

      // Save initial user profile and store settings in Firestore
      try {
        const profile = await saveUserProfile(cred.user.uid, {
          userId: cred.user.uid,
          fullName: fullName.trim(),
          email: email.trim(),
          profilePhoto: null,
        });

        const initialSettings = await getStoreSettings(cred.user.uid);
        setSettings(initialSettings);
        seedStarterProductsIfEmpty(cred.user.uid).catch((seedErr) => {
          console.warn('Starter product seeding warning:', seedErr);
        });

        setUser({
          id: cred.user.uid,
          userId: cred.user.uid,
          name: profile.fullName,
          fullName: profile.fullName,
          email: profile.email,
          profilePhoto: null,
          storeName: initialSettings.storeName,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        });
      } catch (syncErr) {
        console.warn('Non-fatal Firestore sync warning on sign up:', syncErr);
      }
    } catch (err: any) {
      throw new Error(getFirebaseErrorMessage(err));
    }
  };

  // 3. Google Sign-In
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      setFirebaseUser(fbUser);

      const baseUser: User = {
        id: fbUser.uid,
        userId: fbUser.uid,
        name: fbUser.displayName || 'Shopkeeper',
        fullName: fbUser.displayName || 'Shopkeeper',
        email: fbUser.email || '',
        profilePhoto: fbUser.photoURL || null,
        storeName: 'My Kirana Store',
      };
      setUser(baseUser);

      // Load or create Firestore profile
      try {
        await syncUserData(fbUser);
      } catch (syncErr) {
        console.warn('Non-fatal Firestore sync warning on Google login:', syncErr);
      }
    } catch (err: any) {
      throw new Error(getFirebaseErrorMessage(err));
    }
  };

  // 4. Forgot Password
  const sendResetEmail = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      throw new Error(getFirebaseErrorMessage(err));
    }
  };

  // 5. Logout
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Error during signOut:', err);
    } finally {
      setFirebaseUser(null);
      setUser(null);
      setSettings(null);
    }
  };

  // 6. Update Store Settings
  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    const updated = await updateStoreSettings(newSettings);
    setSettings(updated);
    if (newSettings.storeName && user) {
      setUser({ ...user, storeName: newSettings.storeName });
    }
  };

  // 7. Refresh Profile
  const refreshProfile = async () => {
    if (auth.currentUser) {
      await syncUserData(auth.currentUser);
    }
  };

  const isAuthenticated = Boolean(firebaseUser || user);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        settings,
        loading,
        isAuthenticated,
        loginWithEmail,
        signUpWithEmail,
        loginWithGoogle,
        sendResetEmail,
        logout,
        updateSettings,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
