'use client';

import { isNative } from '@/utils/platform';

export type SubscriptionTier = 'free' | 'pro';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt?: string;
  willRenew?: boolean;
}

const RC_API_KEY_IOS = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY || '';
const RC_API_KEY_ANDROID = process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY || '';

export async function initPurchases(userId: string): Promise<void> {
  if (!isNative()) return;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { getPlatform } = await import('@/utils/platform');
    const apiKey = getPlatform() === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
    if (!apiKey) return;
    await Purchases.configure({ apiKey, appUserID: userId });
  } catch (e) {
    console.error('RevenueCat init failed:', e);
  }
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  if (!isNative()) {
    // Web users: check Supabase for subscription_tier
    return { tier: 'free', isActive: false };
  }
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.getCustomerInfo();
    const entitlement = customerInfo.entitlements.active['pro'];
    if (entitlement) {
      return {
        tier: 'pro',
        isActive: true,
        expiresAt: entitlement.expirationDate || undefined,
        willRenew: !entitlement.willRenew ? false : true,
      };
    }
    return { tier: 'free', isActive: false };
  } catch {
    return { tier: 'free', isActive: false };
  }
}

export async function getOfferings(): Promise<any[]> {
  if (!isNative()) return [];
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { offerings } = await Purchases.getOfferings();
    return offerings.current?.availablePackages || [];
  } catch {
    return [];
  }
}

export async function purchasePackage(pkg: any): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.purchasePackage({ aPackage: pkg });
    return true;
  } catch (e: any) {
    if (e?.code === 'PURCHASE_CANCELLED_ERROR') return false;
    console.error('Purchase failed:', e);
    return false;
  }
}

export async function restorePurchases(): Promise<SubscriptionStatus> {
  if (!isNative()) return { tier: 'free', isActive: false };
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.restorePurchases();
    const entitlement = customerInfo.entitlements.active['pro'];
    if (entitlement) return { tier: 'pro', isActive: true };
    return { tier: 'free', isActive: false };
  } catch {
    return { tier: 'free', isActive: false };
  }
}
