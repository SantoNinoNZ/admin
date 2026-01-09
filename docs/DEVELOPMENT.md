# Development Guide

## Getting Started

### Prerequisites

- **Node.js**: Version 18+ (recommended: use Node Version Manager)
- **npm**: Comes with Node.js
- **Git**: For version control
- **GitHub Account**: With access to SantoNinoNZ organization
- **GitHub Personal Access Token**: With `repo` scope
- **Code Editor**: VS Code recommended with extensions

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "yzhang.markdown-all-in-one"
  ]
}
```

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SantoNinoNZ/admin.git
   cd admin
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   ```
   http://localhost:3000
   ```

## Development Workflow

### Branch Strategy
- **main**: Production-ready code (auto-deploys)
- **feature/***: New features
- **bugfix/***: Bug fixes
- **hotfix/***: Critical production fixes

### Commit Convention
Use conventional commits for clear history:
```bash
feat: add image upload functionality
fix: resolve markdown parsing issue
docs: update API documentation
style: improve mobile responsiveness
refactor: optimize GitHub API client
```

### Code Quality

#### TypeScript
- All components must be properly typed
- No `any` types unless absolutely necessary
- Use interfaces for prop definitions
- Leverage type inference where possible

#### Component Structure
```tsx
// Component template
interface ComponentProps {
  // Define all props with types
  title: string;
  isVisible?: boolean; // Optional props marked
  onAction: (data: string) => void; // Functions typed
}

export function Component({ title, isVisible = true, onAction }: ComponentProps) {
  // Component logic
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

#### Error Handling
```tsx
// Always handle async operations
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

const handleAction = async () => {
  setLoading(true);
  setError('');

  try {
    await someAsyncOperation();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An error occurred');
  } finally {
    setLoading(false);
  }
};
```

## Project Structure Deep Dive

### `/src/app/` - Next.js App Router
```
app/
├── layout.tsx          # Root layout with global providers
├── page.tsx           # Main application entry point
└── globals.css        # Global styles (imports only)
```

### `/src/components/` - React Components

#### Component Categories
1. **Layout Components**: Header, navigation, containers
2. **Feature Components**: Dashboard, PostEditor, PostList
3. **UI Components**: Buttons, forms, modals
4. **Provider Components**: Authentication, theme providers

#### Component Guidelines
- **Single Responsibility**: Each component has one clear purpose
- **Composition over Inheritance**: Use composition patterns
- **Props Interface**: Always define TypeScript interfaces
- **Error Boundaries**: Wrap components that might fail
- **Loading States**: Show loading indicators for async operations

### `/src/lib/` - Business Logic

#### `github-api.ts`
```typescript
export class GitHubAPI {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  // All API methods are async and handle errors
  async getPostFiles(): Promise<GitHubFile[]> {
    // Implementation
  }
}
```

#### API Client Guidelines
- **Error Handling**: All methods handle HTTP errors
- **Rate Limiting**: Respect GitHub API limits
- **Type Safety**: All responses properly typed
- **Retry Logic**: Implement for transient failures

### `/src/types/` - Type Definitions

#### Type Organization
```typescript
// Domain types
export interface Post {
  slug: string;
  title: string;
  date: string;
  content: string;
  // ... other fields
}

// API types
export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  // ... GitHub API response fields
}

// Component props (usually co-located)
export interface PostEditorProps {
  post: Post;
  onSave: (post: Post) => void;
}
```

## State Management

### Local State with Hooks
```tsx
// Simple state
const [posts, setPosts] = useState<Post[]>([]);

// Complex state with reducer
const [state, dispatch] = useReducer(postReducer, initialState);

// Derived state
const filteredPosts = useMemo(() =>
  posts.filter(post => post.title.includes(searchQuery)),
  [posts, searchQuery]
);
```

### Global State Strategy
- **Authentication**: Stored in localStorage + component state
- **Posts Data**: Fetched fresh on each session
- **UI State**: Local component state only
- **No Complex State Management**: Redux/Zustand not needed for this app

## Testing Strategy

### Testing Philosophy
- **Unit Tests**: For utility functions and pure components
- **Integration Tests**: For component interactions
- **E2E Tests**: For critical user flows
- **Manual Testing**: For UI/UX verification

### Testing Setup (Future)
```bash
# Add testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom jest

# Test structure
src/
├── components/
│   ├── PostEditor.tsx
│   └── __tests__/
│       └── PostEditor.test.tsx
└── lib/
    ├── github-api.ts
    └── __tests__/
        └── github-api.test.ts
```

## Performance Considerations

### Code Splitting
- **Dynamic Imports**: Load markdown editor only when needed
- **Route-based Splitting**: Automatic with Next.js App Router
- **Component Splitting**: Split large components into smaller ones

### Bundle Optimization
```javascript
// next.config.js
const nextConfig = {
  // Bundle analyzer in development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          openAnalyzer: false,
        })
      );
    }
    return config;
  },
};
```

### GitHub API Optimization
- **Caching**: Cache file listings in component state
- **Batch Operations**: Combine multiple file operations
- **Rate Limit Awareness**: Monitor API usage
- **Lazy Loading**: Load post content only when needed

## Debugging

### Development Tools
1. **Browser DevTools**: React Developer Tools
2. **Network Tab**: Monitor GitHub API calls
3. **Console**: Log API responses and errors
4. **Local Storage**: Inspect stored authentication tokens

### Common Debugging Scenarios

#### Authentication Issues
```typescript
// Check token validity
const testToken = async (token: string) => {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Token status:', response.status);
    console.log('Rate limit:', response.headers.get('X-RateLimit-Remaining'));
  } catch (error) {
    console.error('Token test failed:', error);
  }
};
```

#### API Response Debugging
```typescript
// GitHub API client debugging
private async request(endpoint: string, options: RequestInit = {}) {
  const url = `${GITHUB_API_BASE}${endpoint}`;

  console.log('API Request:', url, options);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${this.token}`,
      ...options.headers,
    },
  });

  console.log('API Response:', response.status, response.headers);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', errorText);
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('API Data:', data);

  return data;
}
```

## Deployment

### Local Build Testing
```bash
# Test production build locally
npm run build
npm run start

# Test static export
npm run export
# Serve the /out directory with a local server
```

### Environment Variables
```bash
# .env.local (for development secrets)
GITHUB_TOKEN=ghp_your_development_token_here
```

### Build Optimization
- **Tree Shaking**: Remove unused code
- **Minification**: Compress JavaScript and CSS
- **Image Optimization**: Use Next.js Image component where possible
- **Static Generation**: Pre-render all pages

## Maintenance

### Dependency Updates
```bash
# Check for outdated packages
npm outdated

# Update packages (be careful with major versions)
npm update

# Update Next.js specifically
npm install next@latest
```

### Security Updates
- **Regular Updates**: Keep dependencies current
- **Security Audits**: Run `npm audit` regularly
- **Token Rotation**: Encourage users to rotate GitHub tokens
- **HTTPS Only**: Ensure all communications are encrypted

### Monitoring
- **Build Status**: Monitor GitHub Actions
- **User Reports**: Track issues from users
- **Performance**: Monitor loading times
- **API Usage**: Track GitHub API rate limits

## Troubleshooting Common Issues

### Build Failures
1. **TypeScript Errors**: Fix type errors before building
2. **Module Resolution**: Check import paths
3. **Node Version**: Ensure compatible Node.js version
4. **Dependency Conflicts**: Clear node_modules and reinstall

### Runtime Errors
1. **Authentication**: Check GitHub token validity
2. **Network Issues**: Verify GitHub API access
3. **Browser Compatibility**: Test in different browsers
4. **Local Storage**: Check for storage quota issues

### Performance Issues
1. **Bundle Size**: Analyze with webpack-bundle-analyzer
2. **API Calls**: Minimize GitHub API requests
3. **Rendering**: Use React DevTools Profiler
4. **Memory Leaks**: Check for event listener cleanup

This development guide provides the foundation for maintaining and extending the Santo Niño Admin Interface. Follow these practices to ensure code quality, performance, and maintainability.