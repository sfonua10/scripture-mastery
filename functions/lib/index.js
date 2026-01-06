"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredChallenges = exports.onChallengeAccepted = exports.onChallengeCompleted = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const expo_server_sdk_1 = require("expo-server-sdk");
// Initialize Firebase Admin
admin.initializeApp();
// Initialize Expo SDK for push notifications
const expo = new expo_server_sdk_1.Expo();
// Firestore database reference
const db = admin.firestore();
/**
 * Triggered when a challenge document is updated.
 * Checks if both players have completed and sends push notifications.
 */
exports.onChallengeCompleted = functions.firestore
    .document('challenges/{challengeId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const challengeId = context.params.challengeId;
    // Check if challenge just completed (both scores now exist)
    const wasIncomplete = before.creatorScore === undefined || before.challengerScore === undefined;
    const isNowComplete = after.creatorScore !== undefined && after.challengerScore !== undefined;
    if (!wasIncomplete || !isNowComplete) {
        // Challenge was already complete or still incomplete
        return null;
    }
    console.log(`Challenge ${challengeId} completed. Processing results...`);
    // Determine winner (we know scores exist from isNowComplete check)
    const creatorScore = after.creatorScore;
    const challengerScore = after.challengerScore;
    let winnerId = null;
    let isTie = false;
    if (creatorScore > challengerScore) {
        winnerId = after.creatorId;
    }
    else if (challengerScore > creatorScore) {
        winnerId = after.challengerId || null;
    }
    else {
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
async function sendChallengeResultNotifications(challenge, winnerId, isTie, challengeId) {
    const messages = [];
    // Get both users' push tokens
    const [creatorDoc, challengerDoc] = await Promise.all([
        db.collection('users').doc(challenge.creatorId).get(),
        challenge.challengerId
            ? db.collection('users').doc(challenge.challengerId).get()
            : Promise.resolve(null),
    ]);
    const creatorProfile = creatorDoc.data();
    const challengerProfile = challengerDoc === null || challengerDoc === void 0 ? void 0 : challengerDoc.data();
    // Prepare notification for creator
    if (creatorProfile === null || creatorProfile === void 0 ? void 0 : creatorProfile.expoPushToken) {
        const token = creatorProfile.expoPushToken;
        if (expo_server_sdk_1.Expo.isExpoPushToken(token)) {
            let title;
            let body;
            if (isTie) {
                title = "It's a tie!";
                body = `You and ${challenge.challengerNickname} both scored ${challenge.creatorScore}/${challenge.questionCount}!`;
            }
            else if (winnerId === challenge.creatorId) {
                title = 'You won!';
                body = `You beat ${challenge.challengerNickname} ${challenge.creatorScore} to ${challenge.challengerScore}!`;
            }
            else {
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
    if ((challengerProfile === null || challengerProfile === void 0 ? void 0 : challengerProfile.expoPushToken) && challenge.challengerId) {
        const token = challengerProfile.expoPushToken;
        if (expo_server_sdk_1.Expo.isExpoPushToken(token)) {
            let title;
            let body;
            if (isTie) {
                title = "It's a tie!";
                body = `You and ${challenge.creatorNickname} both scored ${challenge.challengerScore}/${challenge.questionCount}!`;
            }
            else if (winnerId === challenge.challengerId) {
                title = 'You won!';
                body = `You beat ${challenge.creatorNickname} ${challenge.challengerScore} to ${challenge.creatorScore}!`;
            }
            else {
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
            }
            catch (error) {
                console.error('Error sending push notifications:', error);
            }
        }
    }
}
/**
 * Triggered when a challenge is accepted (status changes to 'accepted').
 * Notifies the creator that someone joined their challenge.
 */
exports.onChallengeAccepted = functions.firestore
    .document('challenges/{challengeId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    // Check if status just changed to 'accepted'
    if (before.status !== 'pending' || after.status !== 'accepted') {
        return null;
    }
    console.log(`Challenge ${context.params.challengeId} accepted by ${after.challengerNickname}`);
    // Get creator's push token
    const creatorDoc = await db.collection('users').doc(after.creatorId).get();
    const creatorProfile = creatorDoc.data();
    if (!(creatorProfile === null || creatorProfile === void 0 ? void 0 : creatorProfile.expoPushToken)) {
        return null;
    }
    const token = creatorProfile.expoPushToken;
    if (!expo_server_sdk_1.Expo.isExpoPushToken(token)) {
        console.log('Invalid Expo push token:', token);
        return null;
    }
    // Send notification to creator
    const message = {
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
    }
    catch (error) {
        console.error('Error sending push notification:', error);
    }
    return null;
});
/**
 * Scheduled function to clean up expired challenges
 * Runs daily at midnight UTC
 */
exports.cleanupExpiredChallenges = functions.pubsub
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
//# sourceMappingURL=index.js.map