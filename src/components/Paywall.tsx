'use client';

import { useState, useEffect } from 'react';
import { getOfferings, purchasePackage, restorePurchases } from '@/services/purchases';
import { X } from 'lucide-react';

interface PaywallProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchased: () => void;
}

export default function Paywall({ isOpen, onClose, onPurchased }: PaywallProps) {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (isOpen) getOfferings().then(setPackages);
  }, [isOpen]);

  const handlePurchase = async (pkg: any) => {
    setLoading(true);
    const success = await purchasePackage(pkg);
    setLoading(false);
    if (success) onPurchased();
  };

  const handleRestore = async () => {
    setRestoring(true);
    const status = await restorePurchases();
    setRestoring(false);
    if (status.isActive) onPurchased();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="text-4xl mb-3">⚡</div>
          <h2 className="text-xl font-black text-white uppercase">Go Pro</h2>
          <p className="text-sm text-zinc-400 mt-2">Unlock the full Refactor Athletics experience</p>
        </div>

        {/* Features */}
        <div className="space-y-2 mb-6">
          {[
            'Unlimited ranked exercises & Power Level',
            'Health sync (WHOOP, Apple Health, Fitbit)',
            'Group challenges & Arena',
            'All themes & character customization',
            'AI food logging',
            'Custom workout programs',
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-zinc-300">
              <span className="text-emerald-400">✓</span>
              {feature}
            </div>
          ))}
        </div>

        {/* Packages */}
        <div className="space-y-2 mb-4">
          {packages.length > 0 ? packages.map((pkg: any) => (
            <button
              key={pkg.identifier}
              onClick={() => handlePurchase(pkg)}
              disabled={loading}
              className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-xl hover:border-orange-500 transition text-left disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">{pkg.product.title || pkg.identifier}</div>
                  <div className="text-[10px] text-zinc-500">{pkg.product.description || ''}</div>
                </div>
                <div className="text-sm font-black text-orange-400">{pkg.product.priceString}</div>
              </div>
            </button>
          )) : (
            <div className="space-y-2">
              <div className="w-full p-4 bg-zinc-800 border border-orange-500/50 rounded-xl text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">Annual</div>
                    <div className="text-[10px] text-zinc-500">7-day free trial, then billed yearly</div>
                  </div>
                  <div className="text-sm font-black text-orange-400">$59.99/yr</div>
                </div>
              </div>
              <div className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-xl text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">Monthly</div>
                    <div className="text-[10px] text-zinc-500">Cancel anytime</div>
                  </div>
                  <div className="text-sm font-black text-orange-400">$7.99/mo</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Restore */}
        <button
          onClick={handleRestore}
          disabled={restoring}
          className="w-full text-center text-xs text-zinc-500 hover:text-white py-2 transition"
        >
          {restoring ? 'Restoring...' : 'Restore Purchases'}
        </button>

        <p className="text-[9px] text-zinc-700 text-center mt-3">
          Payment charged to your Apple ID. Subscription auto-renews unless cancelled 24h before period ends.
        </p>
      </div>
    </div>
  );
}
