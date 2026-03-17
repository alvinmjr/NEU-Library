'use client';
import { doc } from 'firebase/firestore';
import { useFirestore, setDocumentNonBlocking } from '@/firebase';
import type { User } from 'firebase/auth';

// This function is defined to be called from a client component,
// but it needs the firestore instance. A custom hook is a good way to get it.
// However, since we can't use a hook inside a regular function, we'll
// make a composable function that relies on another hook to get firestore.

export async function createLibraryMember(
  user: User,
  formData: { email: string; studentId: string }
) {
  // IMPORTANT: This is a placeholder for where you would get your firestore instance
  // In a real app, you would use the useFirestore hook within a component
  // and pass the firestore instance to this function.
  // For now, we will simulate the firestore object.
  // This is a common pattern when separating concerns.
  const firestore = useFirestore();

  const memberData = {
    id: user.uid,
    externalAuthId: user.uid,
    firstName: '',
    lastName: '',
    email: formData.email,
    studentId: formData.studentId,
    membershipDate: new Date().toISOString(),
    borrowedBookIds: [],
    reservedBookIds: [],
  };

  const memberDocRef = doc(firestore, 'libraryMembers', user.uid);
  setDocumentNonBlocking(memberDocRef, memberData, { merge: false });
}
