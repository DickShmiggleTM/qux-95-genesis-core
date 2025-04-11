
import React, { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui';

// Loading fallbacks
const DefaultLoadingFallback = () => (
  <div className="p-8 w-full flex justify-center items-center">
    <Skeleton className="w-full h-48" />
  </div>
);

const TerminalLoadingFallback = () => (
  <div className="relative font-terminal bg-cyberpunk-dark border border-cyberpunk-neon-green rounded-none pixel-corners pixel-borders h-64">
    <div className="absolute top-0 left-0 right-0 bg-cyberpunk-neon-green h-5 flex items-center px-2">
      <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">LOADING TERMINAL...</div>
    </div>
    <div className="p-4 pt-6 h-full flex items-center justify-center">
      <div className="text-cyberpunk-neon-green animate-pulse">Initializing terminal system...</div>
    </div>
  </div>
);

// Lazy loaded components
export const LazyTerminal = lazy(() => import('./Terminal'));
export const LazyDocumentRag = lazy(() => import('./DocumentRag'));
export const LazySelfModification = lazy(() => import('./SelfModification'));
export const LazyModelSelector = lazy(() => import('./ModelSelector'));
export const LazyChatWindow = lazy(() => import('./ChatWindow'));
export const LazyStatusBar = lazy(() => import('./StatusBar'));

// Wrapped components with suspense
export const Terminal = (props: any) => (
  <Suspense fallback={<TerminalLoadingFallback />}>
    <LazyTerminal {...props} />
  </Suspense>
);

export const DocumentRag = (props: any) => (
  <Suspense fallback={<DefaultLoadingFallback />}>
    <LazyDocumentRag {...props} />
  </Suspense>
);

export const SelfModification = (props: any) => (
  <Suspense fallback={<DefaultLoadingFallback />}>
    <LazySelfModification {...props} />
  </Suspense>
);

export const ModelSelector = (props: any) => (
  <Suspense fallback={<DefaultLoadingFallback />}>
    <LazyModelSelector {...props} />
  </Suspense>
);

export const ChatWindow = (props: any) => (
  <Suspense fallback={<DefaultLoadingFallback />}>
    <LazyChatWindow {...props} />
  </Suspense>
);

export const StatusBar = (props: any) => (
  <Suspense fallback={<DefaultLoadingFallback />}>
    <LazyStatusBar {...props} />
  </Suspense>
);
