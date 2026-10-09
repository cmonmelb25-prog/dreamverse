'use client';

/* -------------------------------------------------------------------------- */
/*                               FIRESTORE EXPORTS                             */
/* -------------------------------------------------------------------------- */

export {
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  getDoc,
  getDocs,
  increment,
  writeBatch,
  arrayUnion,
} from 'firebase/firestore';

export type {
  QueryDocumentSnapshot,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore';

/* -------------------------------------------------------------------------- */
/*                                 AUTH EXPORTS                                */
/* -------------------------------------------------------------------------- */

export {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';

export type { User } from 'firebase/auth';

/* -------------------------------------------------------------------------- */
/*                                STORAGE EXPORTS                              */
/* -------------------------------------------------------------------------- */

export {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

export type { StorageReference } from 'firebase/storage';
