import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    getDocs,
    Firestore,
    doc,
    setDoc
} from 'firebase/firestore';

export interface CertificateData {
    userId: string;
    courseId: string;
    courseName: string;
    instructorName: string;
    issueDate: any; // Timestamp
    certificateId: string;
}

/**
 * Generates a unique certificate ID
 */
function generateCertificateId(): string {
    return 'CERT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

/**
 * Issues a certificate for a completed course
 * @param firestore Firestore instance
 * @param userId User ID
 * @param courseId Course ID
 * @param courseName Course Name
 * @param instructorName Instructor Name (optional)
 */
export async function issueCertificate(
    firestore: Firestore,
    userId: string,
    courseId: string,
    courseName: string,
    instructorName: string = 'eXamplify Instructor'
): Promise<string> {
    try {
        // 1. Check if certificate already exists
        const certsRef = collection(firestore, `users/${userId}/certificates`);
        const q = query(certsRef, where('courseId', '==', courseId));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            console.log('Certificate already exists for this course.');
            return snapshot.docs[0].id;
        }

        // 2. Create new certificate
        const newCertId = generateCertificateId();
        const certData = {
            userId,
            courseId,
            courseName,
            instructorName,
            issueDate: serverTimestamp(),
            certificateId: newCertId,
            metadata: {
                version: '1.0',
                issuer: 'eXamplify Platform'
            }
        };

        // Use setDoc with a custom ID or addDoc for auto-ID? 
        // Let's use addDoc to the subcollection, but we can also store the display ID.
        const docRef = await addDoc(certsRef, certData);

        console.log('Certificate issued successfully:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error issuing certificate:', error);
        throw error;
    }
}

/**
 * Retrieves all certificates for a user
 * @param firestore Firestore instance
 * @param userId User ID
 */
export async function getUserCertificates(
    firestore: Firestore,
    userId: string
): Promise<CertificateData[]> {
    try {
        const certsRef = collection(firestore, `users/${userId}/certificates`);
        const snapshot = await getDocs(certsRef);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as any[];
    } catch (error) {
        console.error('Error fetching certificates:', error);
        return [];
    }
}
