import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Expo SDK for push notifications
const expo = new Expo();

// Firestore database reference
const db = admin.firestore();

interface Challenge {
  id: string;
  challengeCode: string;
  difficulty: string;
  questionCount: number;
  creatorId: string;
  creatorNickname: string;
  creatorScore?: number;
  challengerId?: string;
  challengerNickname?: string;
  challengerScore?: number;
  status: string;
  winnerId?: string;
  isTie?: boolean;
}

interface UserProfile {
  expoPushToken?: string;
  nickname?: string;
}

/**
 * Triggered when a challenge document is updated.
 * Checks if both players have completed and sends push notifications.
 */
export const onChallengeCompleted = functions.firestore
  .document('challenges/{challengeId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() as Challenge;
    const after = change.after.data() as Challenge;
    const challengeId = context.params.challengeId;

    // Check if challenge just completed (both scores now exist)
    const wasIncomplete =
      before.creatorScore === undefined || before.challengerScore === undefined;
    const isNowComplete =
      after.creatorScore !== undefined && after.challengerScore !== undefined;

    if (!wasIncomplete || !isNowComplete) {
      // Challenge was already complete or still incomplete
      return null;
    }

    console.log(`Challenge ${challengeId} completed. Processing results...`);

    // Determine winner (we know scores exist from isNowComplete check)
    const creatorScore = after.creatorScore!;
    const challengerScore = after.challengerScore!;

    let winnerId: string | null = null;
    let isTie = false;

    if (creatorScore > challengerScore) {
      winnerId = after.creatorId;
    } else if (challengerScore > creatorScore) {
      winnerId = after.challengerId || null;
    } else {
      isTie = true;
    }

    // Update challenge with winner info
    await change.after.ref.update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      winnerId,
      isTie,
    });

    // Send push notifications to both players
    await sendChallengeResultNotifications(after, winnerId, isTie, challengeId);

    return null;
  });

/**
 * Send push notifications to both players about the challenge result
 */
async function sendChallengeResultNotifications(
  challenge: Challenge,
  winnerId: string | null,
  isTie: boolean,
  challengeId: string
): Promise<void> {
  const messages: ExpoPushMessage[] = [];

  // Get both users' push tokens
  const [creatorDoc, challengerDoc] = await Promise.all([
    db.collection('users').doc(challenge.creatorId).get(),
    challenge.challengerId
      ? db.collection('users').doc(challenge.challengerId).get()
      : Promise.resolve(null),
  ]);

  const creatorProfile = creatorDoc.data() as UserProfile | undefined;
  const challengerProfile = challengerDoc?.data() as UserProfile | undefined;

  // Prepare notification for creator
  if (creatorProfile?.expoPushToken) {
    const token = creatorProfile.expoPushToken;

    if (Expo.isExpoPushToken(token)) {
      let title: string;
      let body: string;

      if (isTie) {
        title = "It's a tie!";
        body = `You and ${challenge.challengerNickname} both scored ${challenge.creatorScore}/${challenge.questionCount}!`;
      } else if (winnerId === challenge.creatorId) {
        title = 'You won!';
        body = `You beat ${challenge.challengerNickname} ${challenge.creatorScore} to ${challenge.challengerScore}!`;
      } else {
        title = `${challenge.challengerNickname} beat your score!`;
        body = `They scored ${challenge.challengerScore}/${challenge.questionCount} vs your ${challenge.creatorScore}/${challenge.questionCount}`;
      }

      messages.push({
        to: token,
        sound: 'default',
        title,
        body,
        data: { challengeId },
      });
    }
  }

  // Prepare notification for challenger
  if (challengerProfile?.expoPushToken && challenge.challengerId) {
    const token = challengerProfile.expoPushToken;

    if (Expo.isExpoPushToken(token)) {
      let title: string;
      let body: string;

      if (isTie) {
        title = "It's a tie!";
        body = `You and ${challenge.creatorNickname} both scored ${challenge.challengerScore}/${challenge.questionCount}!`;
      } else if (winnerId === challenge.challengerId) {
        title = 'You won!';
        body = `You beat ${challenge.creatorNickname} ${challenge.challengerScore} to ${challenge.creatorScore}!`;
      } else {
        title = `${challenge.creatorNickname} beat your score!`;
        body = `They scored ${challenge.creatorScore}/${challenge.questionCount} vs your ${challenge.challengerScore}/${challenge.questionCount}`;
      }

      messages.push({
        to: token,
        sound: 'default',
        title,
        body,
        data: { challengeId },
      });
    }
  }

  // Send notifications in chunks (Expo recommends max 100 per request)
  if (messages.length > 0) {
    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log('Push notification tickets:', ticketChunk);
      } catch (error) {
        console.error('Error sending push notifications:', error);
      }
    }
  }
}

/**
 * Triggered when a challenge is accepted (status changes to 'accepted').
 * Notifies the creator that someone joined their challenge.
 */
export const onChallengeAccepted = functions.firestore
  .document('challenges/{challengeId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() as Challenge;
    const after = change.after.data() as Challenge;

    // Check if status just changed to 'accepted'
    if (before.status !== 'pending' || after.status !== 'accepted') {
      return null;
    }

    console.log(`Challenge ${context.params.challengeId} accepted by ${after.challengerNickname}`);

    // Get creator's push token
    const creatorDoc = await db.collection('users').doc(after.creatorId).get();
    const creatorProfile = creatorDoc.data() as UserProfile | undefined;

    if (!creatorProfile?.expoPushToken) {
      return null;
    }

    const token = creatorProfile.expoPushToken;

    if (!Expo.isExpoPushToken(token)) {
      console.log('Invalid Expo push token:', token);
      return null;
    }

    // Send notification to creator
    const message: ExpoPushMessage = {
      to: token,
      sound: 'default',
      title: 'Challenge Accepted!',
      body: `${after.challengerNickname} accepted your Scripture Mastery challenge!`,
      data: {
        challengeId: context.params.challengeId,
        challengeCode: after.challengeCode,
      },
    };

    try {
      const tickets = await expo.sendPushNotificationsAsync([message]);
      console.log('Push notification sent:', tickets);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }

    return null;
  });

/**
 * Scheduled function to clean up expired challenges
 * Runs daily at midnight UTC
 */
export const cleanupExpiredChallenges = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();

    // Find expired challenges
    const expiredChallenges = await db
      .collection('challenges')
      .where('expiresAt', '<', now)
      .where('status', 'in', ['pending', 'accepted'])
      .get();

    console.log(`Found ${expiredChallenges.size} expired challenges`);

    // Mark them as expired
    const batch = db.batch();
    expiredChallenges.docs.forEach((doc) => {
      batch.update(doc.ref, { status: 'expired' });
    });

    await batch.commit();
    console.log('Expired challenges cleaned up');

    return null;
  });
