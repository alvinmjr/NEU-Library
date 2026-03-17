'use client';
import { doc, type Firestore } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase';
import type { User } from 'firebase/auth';

export async function createLibraryMember(
  firestore: Firestore,
  user: User,
  formData: { email: string; studentId: string }
) {
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