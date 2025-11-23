import { collection, getDocs, query, Firestore, collectionGroup } from 'firebase/firestore';

/**
 * Calculate user's current token balance by summing all transactions
 * @param firestore Firestore instance
 * @param userId User ID
 * @returns Current token balance
 */
export async function getUserTokenBalance(
    firestore: Firestore,
    userId: string
): Promise<number> {
    try {
        const transactionsRef = collection(firestore, `users/${userId}/tokenTransactions`);
        const snapshot = await getDocs(transactionsRef);

        let balance = 0;
        snapshot.forEach(doc => {
            const amount = doc.data().amount;
            if (typeof amount === 'number') {
                balance += amount;
            }
        });

        return balance;
    } catch (error) {
        console.error('Error calculating token balance:', error);
        return 0;
    }
}

/**
 * Get all token transactions for a user
 * @param firestore Firestore instance
 * @param userId User ID
 * @returns Array of transactions with id
 */
export async function getUserTransactions(
    firestore: Firestore,
    userId: string
): Promise<Array<any>> {
    try {
        const transactionsRef = collection(firestore, `users/${userId}/tokenTransactions`);
        const snapshot = await getDocs(transactionsRef);

        const transactions: any[] = [];
        snapshot.forEach(doc => {
            transactions.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        // Sort by timestamp descending
        transactions.sort((a, b) => {
            const aTime = a.timestamp?.toMillis() || 0;
            const bTime = b.timestamp?.toMillis() || 0;
            return bTime - aTime;
        });

        return transactions;
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}
