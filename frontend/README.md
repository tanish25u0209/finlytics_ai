# Finserv-AIM

A modern, high-performance Fintech application built with Next.js 15, React 19, and Tailwind CSS 4. This platform provides a streamlined experience for loan applications, dashboards for borrowers and managers, and agent integration.

## 🚀 Key Features

*   **Multi-step Loan Application**: A guided wizard for borrowers to select banks, provide company details, GST, income, and more.
*   **Borrower Dashboard**: Real-time tracking of loan status, financial summaries, and history.
*   **Manager Portal**: Comprehensive view for credit managers to review and process applications.
*   **Agent Integration**: Dedicated workspace for financial agents.
*   **Modern UI/UX**: Built with Radix UI primitives and Framer Motion for premium animations.
*   **Data Visualization**: Financial insights powered by Recharts.

## 🛠️ Tech Stack

*   **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
*   **Library**: [React 19](https://react.dev/)
*   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) & [PostCSS](https://postcss.org/)
*   **Components**: [Radix UI](https://www.radix-ui.com/) (Accordion, Dialog, Tabs, etc.)
*   **Animations**: [Framer Motion](https://www.framer.com/motion/)
*   **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Charts**: [Recharts](https://recharts.org/)

## 📦 Getting Started

### Prerequisites

*   Node.js 18+ 
*   pnpm (recommended) or npm/yarn

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Run the development server:
   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📂 Project Structure

*   `app/`: Next.js App Router pages and layouts.
    *   `fintech/apply/`: Loan application wizard.
    *   `fintech/dashboard/`: Borrower dashboard.
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
