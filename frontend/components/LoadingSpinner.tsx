import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  return (
    <div
      className={cn(
        'rounded-full border-primary-600 border-t-transparent animate-spin',
        sizes[size],
        className
      )}
    />
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

export function BookCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-dark-700 border border-white/10">
      <div className="aspect-[2/3] shimmer" />
      <div className="p-3 space-y-2">
        <div className="h-4 shimmer rounded" />
        <div className="h-3 shimmer rounded w-2/3" />
      </div>
    </div>
  );
}
