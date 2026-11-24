import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AiErrorNotice({ children }: { children: ReactNode }) {
  return <Alert variant="destructive" className="mt-2 border-red-700 bg-red-50 text-red-900 dark:border-red-400 dark:bg-red-950 dark:text-red-100 [&>svg]:text-red-700 dark:[&>svg]:text-red-300">
    <AlertCircle aria-hidden="true" className="h-4 w-4" />
    <AlertTitle>Errore AI</AlertTitle>
    <AlertDescription>{children}</AlertDescription>
  </Alert>;
}
