---
name: frontend-engineering
description: Build production-grade React/Next.js applications with clean, scalable code, TypeScript, micro-animations, and polished UX. Use when building SaaS dashboards, web tools, component libraries, or design systems. Focuses on engineering excellence, accessibility, and maintainable architecture. Works alongside frontend-design skill to add technical rigor to creative designs.
---

# Frontend Engineering

This skill guides the creation of production-ready frontend applications with clean architecture, scalable code patterns, and polished user experience. Focus on engineering excellence while maintaining design quality.

## When to Use This Skill

Use this skill when building:
- **Production web applications**: SaaS dashboards, admin panels, web tools
- **Component libraries and design systems**: Reusable, well-documented components
- **Enterprise applications**: Apps requiring scalability, maintainability, type safety
- **Projects with specific tech requirements**: React, Next.js, TypeScript, Vite

**Works with frontend-design**: That skill handles creative aesthetics and visual distinction. This skill ensures the implementation is production-ready, accessible, performant, and maintainable.

## Core Principles

1. **Type Safety First**: Leverage TypeScript for reliability and developer experience
2. **Component Composition**: Build modular, reusable components with clear responsibilities
3. **Performance by Default**: Optimize for fast load times and smooth interactions
4. **Accessibility is Non-Negotiable**: Follow WCAG guidelines and semantic HTML
5. **Polished Micro-Interactions**: Use subtle animations to enhance UX
6. **Scalable Architecture**: Structure code for growth and team collaboration

---

## Tech Stack

### Required Stack
- **Framework**: React 18+ with Vite or Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS 3+
- **Icons**: Lucide React
- **Animations**: Framer Motion (imported as "motion")
- **Components**: shadcn/ui when appropriate

### Project Setup Patterns

**Vite + React:**
```bash
npm create vite@latest project-name -- --template react-ts
npm install -D tailwindcss postcss autoprefixer
npm install framer-motion lucide-react
```

**Next.js:**
```bash
npx create-next-app@latest project-name --typescript --tailwind --app
npm install framer-motion lucide-react
```

---

## Architecture Patterns

### Folder Structure

**For Vite Projects:**
```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── features/        # Feature-specific components
│   └── layouts/         # Layout components
├── lib/
│   ├── utils.ts         # Utility functions
│   ├── hooks/           # Custom React hooks
│   └── types/           # TypeScript types/interfaces
├── pages/               # Page components (if using routing)
├── styles/              # Global styles
└── App.tsx
```

**For Next.js Projects:**
```
app/
├── (routes)/            # Route groups
│   ├── dashboard/
│   └── settings/
├── components/
│   ├── ui/              # shadcn/ui components
│   └── features/        # Feature-specific components
├── lib/
│   ├── utils.ts
│   ├── hooks/
│   └── types/
└── layout.tsx
```

### Component Organization

**Single Responsibility**: Each component should do one thing well.

```typescript
// ❌ Bad: Kitchen sink component
function UserDashboard() {
  // Handles auth, data fetching, layout, analytics...
}

// ✅ Good: Composed from focused components
function UserDashboard() {
  return (
    <DashboardLayout>
      <DashboardHeader />
      <UserStats />
      <ActivityFeed />
    </DashboardLayout>
  );
}
```

**Component Patterns:**

1. **Presentation Components**: Pure UI, no business logic
2. **Container Components**: Handle data fetching and state
3. **Layout Components**: Define page structure
4. **Feature Components**: Combine logic and UI for specific features

---

## TypeScript Best Practices

### Strict Type Safety

Always enable strict mode in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

### Type Patterns

**Props with TypeScript:**
```typescript
// Define clear, specific types
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function Button({ 
  variant, 
  size = 'md', 
  children, 
  ...props 
}: ButtonProps) {
  return <button {...props}>{children}</button>;
}
```

**API Response Types:**
```typescript
// Define data shapes explicitly
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

interface ApiResponse<T> {
  data: T;
  error?: string;
  status: number;
}

// Use generics for reusable patterns
async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  // Implementation
}
```

### Avoid Type Assertions

```typescript
// ❌ Bad: Using 'as' to bypass type checking
const user = response.data as User;

// ✅ Good: Validate at runtime with type guards
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data
  );
}

if (isUser(response.data)) {
  // TypeScript knows this is a User
  console.log(response.data.email);
}
```

---

## React Best Practices

### Hooks Usage

**Custom Hooks for Reusable Logic:**
```typescript
// Extract reusable stateful logic
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

**Optimize with useMemo and useCallback:**
```typescript
function DataTable({ data, onSort }: Props) {
  // Memoize expensive computations
  const sortedData = useMemo(() => 
    data.sort((a, b) => a.value - b.value),
    [data]
  );

  // Memoize callbacks passed to children
  const handleSort = useCallback((column: string) => {
    onSort(column);
  }, [onSort]);

  return <Table data={sortedData} onSort={handleSort} />;
}
```

### State Management

**Lift State Appropriately:**
- Keep state as local as possible
- Lift only when multiple components need it
- Use Context for theme, auth, global settings
- Consider Zustand or React Query for complex state

**Server State vs Client State:**
```typescript
// Next.js App Router: Use Server Components when possible
async function UserProfile({ userId }: Props) {
  // Fetch on server - no loading states needed
  const user = await getUser(userId);
  
  return <ProfileCard user={user} />;
}

// Client Components: For interactive state
'use client';

function InteractiveForm() {
  const [formData, setFormData] = useState({});
  // Client-side interactivity
}
```

---

## Performance Optimization

### Code Splitting

```typescript
// Lazy load heavy components
const HeavyChart = lazy(() => import('./components/HeavyChart'));

function Dashboard() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <HeavyChart data={data} />
    </Suspense>
  );
}
```

### Image Optimization

**Next.js:**
```typescript
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority  // For above-the-fold images
  placeholder="blur"
/>
```

**Vite:**
```typescript
// Use optimized formats and sizes
<img 
  src="/assets/hero.webp" 
  srcSet="/assets/hero-sm.webp 640w, /assets/hero-lg.webp 1200w"
  loading="lazy"
  alt="Hero image"
/>
```

### Bundle Size

- Use `framer-motion` selectively (it's ~40KB)
- Import only needed Lucide icons: `import { CheckIcon } from 'lucide-react'`
- Tree-shake Tailwind with proper purge configuration
- Analyze bundle: `npm run build -- --analyze` (Vite) or `@next/bundle-analyzer` (Next.js)

---

## Accessibility (UX Rules)

### Semantic HTML

```typescript
// ❌ Bad: Div soup
<div onClick={handleClick}>Click me</div>

// ✅ Good: Semantic elements
<button onClick={handleClick}>Click me</button>
```

### ARIA Attributes

```typescript
function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-hidden={!isOpen}
    >
      <h2 id="modal-title">{title}</h2>
      {children}
      <button onClick={onClose} aria-label="Close modal">
        <X />
      </button>
    </div>
  );
}
```

### Keyboard Navigation

```typescript
function Dropdown() {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'Escape':
        closeDropdown();
        break;
      case 'ArrowDown':
        focusNextItem();
        break;
      case 'ArrowUp':
        focusPreviousItem();
        break;
    }
  };

  return (
    <div onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Dropdown content */}
    </div>
  );
}
```

### Focus Management

```typescript
function SearchModal({ isOpen }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  return <input ref={inputRef} type="search" />;
}
```

### Color Contrast

- Ensure text meets WCAG AA standards (4.5:1 for normal text)
- Don't rely solely on color to convey information
- Test with browser accessibility tools

---

## Micro-Animations with Framer Motion

Animations should be **subtle, purposeful, and enhance UX** without being distracting.

### Animation Principles

1. **Respect User Preferences**: Honor `prefers-reduced-motion`
2. **Purposeful Motion**: Every animation should have a reason (guide attention, provide feedback, show relationships)
3. **Performance**: Use transform and opacity (GPU-accelerated)
4. **Timing**: Keep durations short (150-300ms for most interactions)

### Common Patterns

**Page Transitions:**
```typescript
import { motion } from 'framer-motion';

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
```

**Stagger Children:**
```typescript
function List({ items }: Props) {
  return (
    <motion.ul
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1
          }
        }
      }}
      initial="hidden"
      animate="show"
    >
      {items.map(item => (
        <motion.li
          key={item.id}
          variants={{
            hidden: { opacity: 0, x: -20 },
            show: { opacity: 1, x: 0 }
          }}
        >
          {item.content}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

**Hover Interactions:**
```typescript
function Card() {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      Card content
    </motion.div>
  );
}
```

**Loading States:**
```typescript
function LoadingSpinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear'
      }}
    >
      <Loader className="w-6 h-6" />
    </motion.div>
  );
}
```

**Reduced Motion:**
```typescript
import { useReducedMotion } from 'framer-motion';

function AnimatedComponent() {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.3
      }}
    >
      Content
    </motion.div>
  );
}
```

### Animation Guidelines

- **Entrance animations**: 200-300ms, slight vertical movement (y: 20)
- **Hover effects**: 150ms, subtle scale (1.02-1.05) or shadow changes
- **Transitions**: Use spring physics for natural feel
- **Exit animations**: Faster than entrance (150-200ms)
- **Loading states**: Infinite, smooth, clear purpose

---

## Tailwind CSS Best Practices

### Configuration

```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Use semantic color names
        primary: {
          50: '#f0f9ff',
          // ... full scale
          900: '#0c4a6e',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
```

### Class Organization

```typescript
// Use consistent ordering (consider prettier-plugin-tailwindcss)
<div className="
  flex items-center justify-between
  w-full max-w-4xl
  px-4 py-2
  bg-white dark:bg-gray-900
  rounded-lg shadow-md
  transition-all duration-200
  hover:shadow-lg
">
```

### Responsive Design

```typescript
// Mobile-first approach
<div className="
  grid grid-cols-1           // Mobile: 1 column
  md:grid-cols-2             // Tablet: 2 columns
  lg:grid-cols-3             // Desktop: 3 columns
  gap-4 md:gap-6
">
```

### Component Variants with cn()

```typescript
import { cn } from '@/lib/utils';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        // Base styles
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        // Variant styles
        {
          'bg-primary-600 text-white hover:bg-primary-700': variant === 'primary',
          'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
          'hover:bg-gray-100': variant === 'ghost',
        },
        // Size styles
        {
          'h-8 px-3 text-sm': size === 'sm',
          'h-10 px-4': size === 'md',
          'h-12 px-6 text-lg': size === 'lg',
        },
        className
      )}
      {...props}
    />
  );
}
```

---

## shadcn/ui Integration

### When to Use shadcn/ui

- ✅ Common UI patterns (buttons, dialogs, dropdowns, forms)
- ✅ Accessibility-first components
- ✅ Customizable base components
- ❌ Highly custom, unique components (build from scratch)

### Installation

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
```

### Customization

shadcn/ui components are copied to your project, so modify them freely:

```typescript
// components/ui/button.tsx (after shadcn install)
// Customize variants, add new ones, modify styles
const buttonVariants = cva(
  "inline-flex items-center justify-center...",
  {
    variants: {
      variant: {
        default: "bg-primary...",
        // Add custom variant
        gradient: "bg-gradient-to-r from-purple-500 to-pink-500...",
      },
    },
  }
);
```

### Composition with shadcn

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function ConfirmDialog({ isOpen, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Action</DialogTitle>
        </DialogHeader>
        <p>Are you sure you want to proceed?</p>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm}>Confirm</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Code Quality Guidelines

### File Organization

- **One component per file** (except tightly coupled small components)
- **Co-locate related files**: `Button/index.tsx`, `Button/Button.test.tsx`, `Button/Button.stories.tsx`
- **Clear naming**: Use PascalCase for components, camelCase for utilities

### Error Handling

```typescript
// Use Error Boundaries for component errors
class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

// Handle async errors
async function fetchData() {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;  // Re-throw for caller to handle
  }
}
```

### Comments and Documentation

```typescript
/**
 * Custom hook for managing form state with validation
 * @param initialValues - Initial form field values
 * @param validationSchema - Yup validation schema
 * @returns Form state and handlers
 */
export function useForm<T>(
  initialValues: T,
  validationSchema: Schema
) {
  // Implementation
}

// Inline comments for complex logic
function calculateDiscount(price: number, userTier: string) {
  // Premium users get 20% off, standard users get 10%
  const multiplier = userTier === 'premium' ? 0.8 : 0.9;
  return price * multiplier;
}
```

### Consistent Patterns

- Use arrow functions for components: `const Component = () => {}`
- Destructure props in function signature
- Use optional chaining: `user?.email`
- Use nullish coalescing: `value ?? defaultValue`
- Early returns for guards

---

## Testing Considerations

While this skill focuses on implementation, consider testability:

```typescript
// Write testable components
function UserCard({ user }: Props) {
  // ✅ Separated logic makes testing easier
  const displayName = formatUserName(user);
  const avatarUrl = user.avatar || DEFAULT_AVATAR;
  
  return (
    <div data-testid="user-card">
      <img src={avatarUrl} alt={displayName} />
      <h3>{displayName}</h3>
    </div>
  );
}

// Extract pure functions
export function formatUserName(user: User): string {
  return user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.email;
}
```

---

## Next.js Specific Patterns

### App Router (Next.js 14+)

**Server Components by Default:**
```typescript
// app/dashboard/page.tsx
// This is a Server Component (default)
async function DashboardPage() {
  const data = await fetchDashboardData();
  
  return (
    <div>
      <ServerSideChart data={data} />
      <InteractiveWidget /> {/* This can be a Client Component */}
    </div>
  );
}
```

**Client Components When Needed:**
```typescript
// components/InteractiveWidget.tsx
'use client';

import { useState } from 'react';

export function InteractiveWidget() {
  const [count, setCount] = useState(0);
  // Uses client-side interactivity
}
```

### Data Fetching

```typescript
// Server Component - fetch directly
async function UserProfile({ userId }: Props) {
  const user = await db.user.findUnique({ where: { id: userId } });
  return <ProfileCard user={user} />;
}

// Client Component - use SWR or React Query
'use client';

function UserProfile({ userId }: Props) {
  const { data: user, error, isLoading } = useSWR(
    `/api/users/${userId}`,
    fetcher
  );
  
  if (isLoading) return <Skeleton />;
  if (error) return <Error />;
  return <ProfileCard user={user} />;
}
```

### Route Handlers (API Routes)

```typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const users = await db.user.findMany();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const body = await request.json();
  const user = await db.user.create({ data: body });
  return NextResponse.json(user, { status: 201 });
}
```

---

## Common Patterns & Solutions

### Form Handling

```typescript
function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validate
    const newErrors = validateForm(formData);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    // Submit
    try {
      await submitForm(formData);
      // Success state
    } catch (error) {
      setErrors({ submit: 'Failed to submit form' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### Dark Mode

```typescript
// Use next-themes for Next.js or custom provider
import { useTheme } from 'next-themes';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </button>
  );
}

// Tailwind dark mode classes
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

### Infinite Scroll

```typescript
function InfiniteList({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, page]);

  const loadMore = async () => {
    const newData = await fetchData(page + 1);
    if (newData.length === 0) {
      setHasMore(false);
      return;
    }
    setData(prev => [...prev, ...newData]);
    setPage(prev => prev + 1);
  };

  return (
    <div>
      {data.map(item => <ItemCard key={item.id} item={item} />)}
      <div ref={observerRef} />
      {hasMore && <LoadingSpinner />}
    </div>
  );
}
```

---

## Checklist for Production-Ready Code

Before considering a component complete, verify:

### Functionality
- [ ] Component works as expected in all states (loading, error, empty, success)
- [ ] Edge cases handled (no data, network errors, invalid inputs)
- [ ] All interactive elements are functional

### TypeScript
- [ ] No `any` types (or explicitly justified)
- [ ] All props properly typed
- [ ] Return types specified for functions
- [ ] No type errors or warnings

### Accessibility
- [ ] Semantic HTML elements used
- [ ] ARIA attributes where necessary
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader tested (or considered)

### Performance
- [ ] No unnecessary re-renders
- [ ] Images optimized
- [ ] Code splitting for large dependencies
- [ ] Memoization where beneficial

### UX Polish
- [ ] Loading states for async operations
- [ ] Error messages are helpful
- [ ] Success feedback provided
- [ ] Animations are smooth and purposeful
- [ ] Responsive across breakpoints

### Code Quality
- [ ] Consistent naming conventions
- [ ] Proper file organization
- [ ] No console.logs in production code
- [ ] Comments for complex logic
- [ ] Reusable patterns extracted

---

## Final Notes

This skill prioritizes **engineering excellence** while maintaining design quality. The goal is production-ready code that:
- Scales with your application
- Is maintainable by teams
- Provides excellent UX
- Follows industry best practices
- Is accessible to all users

Remember: Clean code is not about being clever—it's about being clear, consistent, and considerate of the next developer (which might be you in six months).

When combined with the **frontend-design** skill's aesthetic guidance, you get the best of both worlds: distinctive, beautiful interfaces built on solid, scalable foundations.
