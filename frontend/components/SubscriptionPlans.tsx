'use client';

import { useState } from 'react';
import { Check, Crown, Zap, Star, Infinity } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface SubscriptionPlansProps {
  onSelectPlan?: (plan: string) => void;
  currentPlan?: string;
}

const planIcons = {
  monthly: Zap,
  quarterly: Star,
  yearly: Crown,
  lifetime: Infinity,
};

export default function SubscriptionPlans({ onSelectPlan, currentPlan }: SubscriptionPlansProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelect = (plan: string) => {
    setSelectedPlan(plan);
    onSelectPlan?.(plan);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {SUBSCRIPTION_PLANS.map((plan) => {
        const Icon = planIcons[plan.plan];
        const isSelected = selectedPlan === plan.plan || currentPlan === plan.plan;

        return (
          <div
            key={plan.id}
            className={cn(
              'relative rounded-2xl p-6 border transition-all cursor-pointer group',
              plan.is_popular
                ? 'border-primary-500 bg-primary-900/20 shadow-glow'
                : 'border-white/10 glass hover:border-primary-500/50',
              isSelected && 'border-primary-400 shadow-glow scale-105'
            )}
            onClick={() => handleSelect(plan.plan)}
          >
            {plan.is_popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                plan.is_popular ? 'bg-primary-600' : 'bg-dark-600'
              )}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-white text-lg">{plan.name}</h3>
            </div>

            <div className="mb-6">
              <span className="text-3xl font-bold text-white">{formatPrice(plan.price)}</span>
              {plan.plan !== 'lifetime' && (
                <span className="text-gray-400 text-sm ml-1">
                  / {plan.plan === 'monthly' ? 'mo' : plan.plan === 'quarterly' ? 'qtr' : 'yr'}
                </span>
              )}
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              className={cn(
                'w-full py-2.5 rounded-xl text-sm font-semibold transition-all',
                isSelected || plan.is_popular
                  ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-glow'
                  : 'border border-white/20 text-gray-300 hover:border-primary-500 hover:text-white'
              )}
            >
              {currentPlan === plan.plan ? 'Current Plan' : 'Get Started'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
