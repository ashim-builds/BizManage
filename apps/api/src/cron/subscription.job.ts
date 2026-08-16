import cron from 'node-cron';
import { globalPrisma } from '@bizmanage/database';
import { sendSubscriptionExpiringEmail, sendSubscriptionExpiredEmail } from '../services/emailService.js';
import { AuditService } from '../services/audit.service.js';

export async function processSubscriptions() {
  console.log('[CRON] Starting subscription expiration process...');

  const now = new Date();

  // 1. Mark expired subscriptions
  const expiredSubscriptions = await globalPrisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      endDate: { lte: now }
    },
    include: { business: true, subscriptionPackage: true }
  });

  for (const sub of expiredSubscriptions) {
    console.log(`[CRON] Expiring subscription ${sub.id} for business ${sub.businessId}`);
    
    await globalPrisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'EXPIRED' }
    });

    await globalPrisma.business.update({
      where: { id: sub.businessId },
      data: { 
        subscriptionStatus: 'EXPIRED',
        subscriptionPackageId: null
      }
    });

    // Send Expiration Email
    const owner = await globalPrisma.user.findFirst({
      where: {
        memberships: {
          some: { businessId: sub.businessId, role: 'OWNER' }
        }
      }
    });

    if (owner && owner.email) {
      // Check if EXPIRED email was already sent
      const notif = await globalPrisma.subscriptionNotification.findFirst({
        where: { subscriptionId: sub.id, notificationType: 'EXPIRED' }
      });

      if (!notif) {
        await sendSubscriptionExpiredEmail(
          owner.email, 
          sub.business.name
        );

        await globalPrisma.subscriptionNotification.create({
          data: {
            businessId: sub.businessId,
            subscriptionId: sub.id,
            notificationType: 'EXPIRED'
          }
        });
      }
    }

    AuditService.logEvent({
      action: 'SUBSCRIPTION_EXPIRED',
      module: 'Subscription',
      businessId: sub.businessId,
      recordId: sub.id,
      newValue: { status: 'EXPIRED' }
    });
  }

  // 2. Process expiring soon notifications
  const daysToCheck = [30, 7, 3, 1];
  
  for (const days of daysToCheck) {
    const targetDateMin = new Date();
    targetDateMin.setDate(targetDateMin.getDate() + days);
    targetDateMin.setHours(0, 0, 0, 0);

    const targetDateMax = new Date();
    targetDateMax.setDate(targetDateMax.getDate() + days);
    targetDateMax.setHours(23, 59, 59, 999);

    const expiringSubs = await globalPrisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: targetDateMin,
          lte: targetDateMax
        }
      },
      include: { business: true, subscriptionPackage: true }
    });

    for (const sub of expiringSubs) {
      const type = `${days}D`;
      
      const notif = await globalPrisma.subscriptionNotification.findFirst({
        where: { subscriptionId: sub.id, notificationType: type }
      });

      if (!notif) {
        console.log(`[CRON] Sending ${days} days warning for subscription ${sub.id}`);
        
        const owner = await globalPrisma.user.findFirst({
          where: {
            memberships: {
              some: { businessId: sub.businessId, role: 'OWNER' }
            }
          }
        });

        if (owner && owner.email) {
          await sendSubscriptionExpiringEmail(
            owner.email, 
            sub.business.name, 
            days
          );

          await globalPrisma.subscriptionNotification.create({
            data: {
              businessId: sub.businessId,
              subscriptionId: sub.id,
              notificationType: type
            }
          });
        }
      }
    }
  }

  console.log('[CRON] Subscription expiration process completed.');
}

// Start the cron job
export function startSubscriptionCron() {
  // Run every minute for testing
  cron.schedule('* * * * *', () => {
    processSubscriptions().catch(console.error);
  });
  
  // Also run it once on startup (with a small delay)
  setTimeout(() => {
    processSubscriptions().catch(console.error);
  }, 10000);
}
