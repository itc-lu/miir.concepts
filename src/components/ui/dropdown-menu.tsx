'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { ChevronRight, Check } from 'lucide-react';

interface DropdownContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const DropdownContext = React.createContext<DropdownContextType | undefined>(undefined);

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownContext.Provider>
  );
}

function useDropdown() {
  const context = React.useContext(DropdownContext);
  if (!context) {
    throw new Error('Dropdown components must be used within a DropdownMenu');
  }
  return context;
}

function DropdownMenuTrigger({
  children,
  asChild,
  className,
}: {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}) {
  const { open, setOpen, triggerRef } = useDropdown();
  const localRef = React.useRef<HTMLButtonElement>(null);

  const handleClick = () => setOpen(!open);

  React.useEffect(() => {
    triggerRef.current = localRef.current;
  }, [triggerRef]);

  if (asChild && React.isValidElement(children)) {
    const childElement = children as React.ReactElement<{
      onClick?: () => void;
      className?: string;
      ref?: React.Ref<HTMLElement>;
    }>;
    return React.cloneElement(childElement, {
      onClick: handleClick,
      className: cn(childElement.props.className, className),
      ref: (el: HTMLElement) => {
        triggerRef.current = el;
        if (typeof childElement.props.ref === 'function') {
          childElement.props.ref(el);
        }
      },
    });
  }

  return (
    <button
      ref={localRef}
      type="button"
      onClick={handleClick}
      className={className}
    >
      {children}
    </button>
  );
}

function DropdownMenuContent({
  children,
  className,
  align = 'start',
  sideOffset = 4,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  align?: 'start' | 'end' | 'center';
  sideOffset?: number;
}) {
  const { open, setOpen, triggerRef } = useDropdown();
  const ref = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    function updatePosition() {
      if (triggerRef.current && open) {
        const rect = triggerRef.current.getBoundingClientRect();
        const menuWidth = 192; // min-w-[12rem] = 192px

        let left = rect.left;
        if (align === 'end') {
          left = rect.right - menuWidth;
        } else if (align === 'center') {
          left = rect.left + (rect.width / 2) - (menuWidth / 2);
        }

        // Ensure menu doesn't go off-screen
        const rightEdge = left + menuWidth;
        if (rightEdge > window.innerWidth) {
          left = window.innerWidth - menuWidth - 8;
        }
        if (left < 8) {
          left = 8;
        }

        setPosition({
          top: rect.bottom + sideOffset,
          left,
        });
      }
    }

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, align, sideOffset, triggerRef]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        ref.current &&
        !ref.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, setOpen, triggerRef]);

  if (!open || !mounted) return null;

  const content = (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999,
      }}
      className={cn(
        'min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );

  return createPortal(content, document.body);
}

function DropdownMenuItem({
  children,
  className,
  inset,
  disabled,
  onClick,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean; disabled?: boolean }) {
  const { setOpen } = useDropdown();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    onClick?.(e);
    setOpen(false);
  };

  return (
    <div
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        inset && 'pl-8',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
}

function DropdownMenuLabel({
  children,
  className,
  inset,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return (
    <div
      className={cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)}
      {...props}
    >
      {children}
    </div>
  );
}

function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('-mx-1 my-1 h-px bg-muted', className)} {...props} />;
}

function DropdownMenuGroup({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props}>{children}</div>;
}

function DropdownMenuCheckboxItem({
  children,
  className,
  checked,
  onCheckedChange,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <div
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        className
      )}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && <Check className="h-4 w-4" />}
      </span>
      {children}
    </div>
  );
}

function DropdownMenuSub({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>;
}

function DropdownMenuSubTrigger({
  children,
  className,
  inset,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return (
    <div
      className={cn(
        'flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent',
        inset && 'pl-8',
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </div>
  );
}

function DropdownMenuSubContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'absolute left-full top-0 z-[9999] ml-1 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
