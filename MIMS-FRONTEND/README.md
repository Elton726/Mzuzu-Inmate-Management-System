# MIMS Frontend - Mzuzu Inmate Management System

A modern React-based frontend application for prison inmate management, built with cutting-edge web technologies and following Malawi government design standards.

## 🚀 Overview

The MIMS Frontend is a comprehensive web application designed to streamline prison inmate management operations. It provides role-based access control for different prison staff members, including reception officers, station officers, and administrators.

## 🏗️ Architecture

### Technology Stack
- **Framework**: React 19.2.0 with Vite build tool
- **State Management**: Redux Toolkit + React Context
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS with custom Malawi theme
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios with custom interceptors
- **Icons**: React Icons (Material Design)
- **Notifications**: React Toastify

### Project Structure

```
MIMS-FRONTEND/
├── src/
│   ├── components/           # Global reusable components
│   │   ├── common/          # Shared UI components
│   │   ├── ProtectedRoute.jsx # Route protection wrapper
│   │   ├── Sidebar.jsx      # Main navigation sidebar
│   │   └── Toast.jsx        # Notification component
│   ├── contexts/            # React Context providers
│   │   ├── AuthContext.jsx  # Authentication state management
│   │   ├── ToastContext.jsx # Toast notification state
│   │   └── useAuth.js       # Auth hook utilities
│   ├── modules/             # Feature-based modules
│   │   ├── admin/           # Admin functionality
│   │   │   ├── components/  # Admin-specific components
│   │   │   ├── pages/       # Admin pages (Dashboard, UserManagement)
│   │   │   └── services/    # Admin API services
│   │   ├── admissions/      # Inmate admissions module
│   │   │   ├── components/  # Admission components (Stepper, forms)
│   │   │   ├── pages/       # Admission pages (Index, Form, Show, Detail)
│   │   │   ├── schemas/     # Zod validation schemas
│   │   │   └── services/    # Admission API services
│   │   ├── auth/            # Authentication module
│   │   ├── home/            # Home/dashboard module
│   │   └── user/            # User profile module
│   ├── services/            # Global services
│   │   ├── apiClient.js     # Axios instance configuration
│   │   └── apiService.js    # Centralized API service
│   ├── utils/               # Utility functions
│   │   ├── helpers.js       # General utilities (validation, formatting)
│   │   └── normalizeApiError.js # Error handling utilities
│   ├── App.jsx              # Main application component
│   ├── main.jsx             # React application entry point
│   └── index.css            # Global styles and Tailwind imports
├── public/                  # Static assets
├── package.json             # Dependencies and scripts
├── vite.config.js           # Vite build configuration
├── tailwind.config.js       # Tailwind CSS configuration
└── README.md               # This file
```

## 🎨 Design System

### Malawi National Colors
The application uses the official Malawi national colors as defined in the design system:

- **Malawi Black** (#000000) - Primary text and borders
- **Malawi Red** (#D71920) - Error states, important actions, alerts
- **Malawi Gold** (#FFD700) - Primary brand color, backgrounds, accents
- **Malawi Green** (#00843D) - Success states, positive actions

### Component Styles
- **Modern Heading**: Large, bold red headings with consistent spacing
- **Modern Card**: White cards with shadows and green accent borders
- **Global Body**: Gold background with black text

## 🔐 Authentication & Authorization

### User Roles
1. **Administrator** - Full system access, user management
2. **Reception Officer** - Inmate admissions and basic inmate management
3. **Station Officer** - Inmate viewing and limited management functions
4. **Officer on Duty** - Basic operational access
5. **Gatekeeper** - Entry/exit logging access

### Route Protection
Routes are protected using role-based access control:
- Public routes: `/login`
- Protected routes: `/`, `/profile`
- Role-restricted: `/admissions/*` (Reception Officer), `/admin/*` (Admin only)

## 📡 API Integration

### Service Architecture
- **ApiService**: Singleton class handling all HTTP requests
- **Rate Limiting**: Automatic rate limit tracking and user feedback
- **Error Handling**: Comprehensive error parsing and normalization
- **Token Management**: JWT token persistence and automatic attachment

### Key API Endpoints
- **Authentication**: Login, logout, profile management
- **Users**: CRUD operations, bulk actions, role management
- **Admissions**: Inmate creation, admission processing, document upload
- **Cells**: Available cell management
- **Activities**: Prison activity listings

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Backend API server running on `http://localhost:8000`

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MIMS-FRONTEND
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔧 Configuration

### Environment Variables
The application connects to the backend API at `http://localhost:8000/api` by default. Update `API_BASE_URL` in `apiService.js` for different environments.

### Tailwind Configuration
Custom colors and theme settings are defined in `tailwind.config.js`. The Malawi color palette is extended for consistent theming.

## 📱 Features

### Core Functionality
- **User Authentication**: Secure login/logout with JWT tokens
- **Role-Based Access**: Different permissions for different user types
- **Inmate Management**: Complete inmate lifecycle management
- **Document Upload**: File upload with validation and progress tracking
- **Real-time Notifications**: Toast notifications for user feedback
- **Responsive Design**: Mobile-friendly interface

### Advanced Features
- **Form Validation**: Client-side validation with Zod schemas
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Loading States**: Skeleton loading and progress indicators
- **Offline Support**: Service worker for caching (future enhancement)
- **Accessibility**: ARIA labels and keyboard navigation support

## 🧪 Testing

### Testing Strategy
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API service and context testing
- **E2E Tests**: User workflow testing (future implementation)

### Running Tests
```bash
npm run test
```

## 📦 Deployment

### Build Process
1. Run `npm run build` to create optimized production build
2. Serve the `dist/` directory with any static file server
3. Configure reverse proxy for API calls if needed

### Environment Setup
- Ensure backend API is accessible
- Configure CORS settings on backend
- Set up SSL certificates for production
- Configure rate limiting and security headers

## 🤝 Contributing

### Code Standards
- Use ESLint configuration for code quality
- Follow React best practices and hooks guidelines
- Maintain consistent naming conventions
- Add JSDoc comments for functions and components

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with proper testing
3. Run linting and fix issues
4. Submit pull request with detailed description

## 📄 License

This project is part of the Mzuzu University ICT degree program third-year project.

## 👥 Team

Developed by ICT students at Mzuzu University as part of the third-year project requirements.

## 📞 Support

For technical support or questions about the codebase, please refer to the project documentation or contact the development team.</content>
<parameter name="filePath">/home/fowardsynch/Prison-project/MIMS-FRONTEND/README.md