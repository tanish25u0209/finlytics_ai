# Finserv-AIM

Modern React-based frontend for Finlytics AI lending platform, providing intuitive interfaces for borrower applications, credit manager review, and loan decision workflow.

## Features

### For Borrowers
- ✅ **Multi-step Loan Application**: Guided wizard with document uploads (GST, bank statements, ITR)
- ✅ **Real-time Risk Scoring**: Instant feedback on loan eligibility
- ✅ **Dashboard**: Track application status, view decisions, and communicate with managers  
- ✅ **Agent Integration**: AI-powered assistance through the application process
- ✅ **Scoring Explanation**: Transparent top 5 factors driving approval/rejection

### For Credit Managers
- ✅ **Application Queue**: View all submitted applications with sorting/filtering
- ✅ **Scoring Review**: ML model recommendations with confidence scores
- ✅ **CAM Generation**: Automated Committee Appraisal Memo with structured insights
- ✅ **Document Verification**: Approve/reject uploaded financial documents
- ✅ **Loan Customization**: Override system recommendations with approved amounts and tenures
- ✅ **Chat Interface**: Communicate directly with borrowers about applications

### For Platform
- ✅ **Real-time Updates**: WebSocket-ready architecture for live notifications
- ✅ **Responsive Design**: Mobile-friendly UI with TailwindCSS
- ✅ **Type Safety**: Full TypeScript coverage for maintainability
- ✅ **Component Library**: Radix UI primitives for accessibility
- ✅ **State Management**: React Context for lightweight application state

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Framework** | Next.js with App Router | Latest |
| **Runtime** | React 18+ | Latest |
| **Language** | TypeScript | Strict mode |
| **Styling** | TailwindCSS | Latest |
| **UI Components** | Radix UI | Latest |
| **Icons** | Lucide React | Latest |
| **State** | React Context + Hooks | - |
| **Package Manager** | pnpm | v8+ |

## Getting Started

### Prerequisites
- Node.js 18+ (recommended: 20 LTS)
- pnpm 8+ (npm/yarn also supported)
- Backend API running on `http://localhost:8000`

### Quick Start

```bash
# Install dependencies
pnpm install

# Configure environment (optional - uses defaults)
# Create .env.local with:
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1

# Run development server
pnpm dev

# Open http://localhost:3000 in browser
```

### Build for Production

```bash
pnpm build
pnpm start
```

## Project Structure

```
frontend/
├── app/                           # Next.js App Router
│   ├── globals.css                # Global styles
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home page
│   └── fintech/                   # Main application
│       ├── layout.tsx             # Fintech layout (nav, sidebar)
│       ├── page.tsx               # Dashboard/index
│       ├── apply/                 # Borrower application workflow
│       │   ├── page.tsx           # Application form with steps
│       │   └── agents/            # AI agent dashboard
│       ├── dashboard/             # Borrower tracking dashboard
│       │   └── page.tsx           # Application status tracking
│       └── manager/               # Credit manager portal
│           └── page.tsx           # Manager review interface
├── components/                    # Reusable React components
│   ├── Navbar.tsx                 # Top navigation bar
│   ├── theme-provider.tsx         # Theme context
│   └── ui/                        # Radix UI component wrappers
│       ├── accordion.tsx
│       ├── alert-dialog.tsx
│       ├── dialog.tsx
│       └── ... (other Radix components)
├── hooks/                         # Custom React hooks
│   ├── use-mobile.ts              # Responsive design detection
│   └── use-toast.ts               # Toast notifications
├── lib/                           # Utilities and helpers
│   ├── AppContext.tsx             # Global app state context
│   ├── appReducer.ts              # State management reducer
│   ├── mockData.ts                # Demo/test fixtures
│   ├── types/                     # TypeScript type definitions
│   └── utils.ts                   # Utility functions
├── public/                        # Static assets
│   └── mock_pdfs/                 # Sample document PDFs for demo
├── styles/                        # Additional styles
└── package.json                   # Dependencies and scripts
```

## Key Components

### Application Pages

#### `/` - Home Page
- Landing page with platform overview
- Links to borrower and manager portals

#### `/fintech/apply` - Loan Application Wizard
- **Step 1**: Company Information (name, GST, industry)
- **Step 2**: Financial Data (revenue, debt, EMI, business age)
- **Step 3**: Document Upload (GST, bank statement, ITR)
- **Step 4**: Real-time Scoring Display
- **Output**: Risk band, loan recommendation, top 5 factors
- **Integration**: Connects to backend `/api/v1/score/gstin` endpoint

#### `/fintech/dashboard` - Borrower Dashboard
- Application status tracking (submitted → decision)
- Financial summary from uploaded documents
- Communication history with credit managers
- Document verification status

#### `/fintech/manager` - Credit Manager Portal
- Queue of applications pending review
- ML model scoring with recommendations
- Committee Appraisal Memo (CAM) generator
- Document verification workflow
- Loan amount/tenure adjustment interface
- Borrower communication tools

#### `/fintech/agents` - Agent Integration
- AI agent collaboration workspace
- KYC verification agent
- Financial analysis agent
- Fraud detection monitoring
- Decision recommendation engine

### State Management

Global application state managed via React Context:

```typescript
// lib/AppContext.tsx
interface AppContextType {
   applications: Application[];
   currentUser: AuthUser | null;
   scoringResults: ScoringResponse[];
   // ... more state
}

export const useAppContext = () => useContext(AppContext);
```

### API Integration

All API calls use environment-configurable base URL:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

// Example: Score a GSTIN
const response = await fetch(`${API_BASE_URL}/score/gstin`, {
   method: 'POST',
   body: JSON.stringify({ gstin, applicant_phone, ... })
});
```

## Environment Variables

Create `.env.local` in the frontend directory:

```bash
# API Configuration (optional - defaults to localhost proxy)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G_XXXXXXXXXXXX
```

## Development

### Hot Reload
- Automatic on code changes (Next.js dev server)
- No manual restart needed

### Code Quality
- **Language**: TypeScript with strict mode enabled
- **Linting**: ESLint configured (see `eslint.config.mjs`)
- **Formatting**: Recommended to use Prettier

### TypeScript Compiler Configuration
- `tsconfig.json` with strict type checking enabled
- All files should have proper type annotations

## Building & Deployment

### Local Build
```bash
pnpm build  # Creates optimized production build in .next/
pnpm start  # Runs production build locally
```

### Docker Deployment
```bash
# Build Docker image
docker build -t finlytics-frontend .

# Run container
docker run -p 3000:3000 \
   -e NEXT_PUBLIC_API_BASE_URL=https://api.example.com \
   finlytics-frontend
```

### Cloud Deployment

**Vercel (Recommended for Next.js)**
```bash
vercel --prod
```

**AWS/GCP/Azure**
- Build: `pnpm build` → outputs to `.next/`
- Deploy: Use serverless platforms (Lambda, Cloud Functions, App Service)

## Performance Optimization

- **Code Splitting**: Automatic per-route with Next.js App Router
- **Image Optimization**: next/image component for responsive images
- **CSS Optimization**: TailwindCSS tree-shaking removes unused styles
- **Bundle Analysis**: Check with `npm run analyze` if configured

## Styling Guide

### TailwindCSS
- Use utility classes for styling
- Custom colors defined in `tailwind.config.js`
- Responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`

### Component Styling Example
```tsx
<div className="mt-4 p-6 rounded-lg bg-blue-50 border border-blue-200">
   <h2 className="text-xl font-bold text-gray-900">Title</h2>
   <p className="mt-2 text-gray-600">Description</p>
</div>
```

## Testing

### Unit Tests (when configured)
```bash
pnpm test
```

### Manual Testing
1. Test borrower flow: Login → Apply → Submit
2. Test manager flow: Review → Score → Decision
3. Test responsive design on mobile (DevTools)
4. Test with different browsers (Chrome, Firefox, Safari)

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari 14+
- Mobile: iOS Safari 14+, Chrome Android

## Dependencies

### Production
- `next`: Full-stack React framework
- `react`: UI library
- `typescript`: Type safety
- `tailwindcss`: Utility-first CSS
- `radix-ui/*`: Accessible UI primitives
- `lucide-react`: Icon library

### Development
- `@types/node`, `@types/react`: Type definitions
- `tailwindcss`: CSS framework
- `postcss`: CSS processing

See `package.json` for complete dependencies list.

## Troubleshooting

### API Connection Issues
```bash
# Check if backend is running on port 8000
curl http://localhost:8000/api/v1/health

# If not: start backend first (see backend/README.md)
# Then verify API_BASE_URL env var is correct
```

### Port 3000 Already in Use
```bash
# Use different port
pnpm dev -- -p 3001
```

### TypeScript Errors
```bash
# Generate types
pnpm tsc --noEmit

# Check specific file
pnpm tsc frontend/app/page.tsx
```
    *   `fintech/manager/`: Employee/Manager portal.
    *   `fintech/agents/`: Agent workspace.
*   `components/`: Reusable UI components (Shadcn/UI base).
*   `hooks/`: Custom React hooks.
*   `lib/`: Utility functions and shared logic.
*   `styles/`: Global styles and Tailwind configuration.

## 🏗️ Building for Production

To create an optimized production build:

```bash
pnpm build
pnpm start
```

## 📜 License

Private project. All rights reserved.
