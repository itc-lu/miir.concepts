import { Film } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-muted/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex items-center gap-2 text-primary">
            <Film className="h-10 w-10" />
            <span className="text-2xl font-bold">CAT</span>
          </div>
        </div>
        <h2 className="mt-4 text-center text-sm text-muted-foreground">
          Cinema Automation Tool
        </h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border">
          {children}
        </div>
      </div>
    </div>
  );
}
