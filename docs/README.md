# KARE Bot - Implementation Documentation

## Overview

KARE Bot is a React Native application built with Expo that provides a comprehensive student management system with AI-powered chatbot functionality, Gmail integration, and various academic tools.

## Table of Contents

1. [App Architecture](#app-architecture)
2. [Authentication Flow](#authentication-flow)
3. [Navigation Structure](#navigation-structure)
4. [Screen Implementations](#screen-implementations)
5. [Data Flow & State Management](#data-flow--state-management)
6. [API Integrations](#api-integrations)
7. [Performance Optimizations](#performance-optimizations)

## App Architecture

![App Architecture](images/app-architecture.png)

### Technology Stack
- **Framework**: React Native with Expo
- **Navigation**: React Navigation (Stack + Tab)
- **State Management**: React Context + AsyncStorage
- **Backend**: Supabase (Auth, Database, Real-time)
- **UI Components**: React Native Paper
- **Authentication**: Google OAuth + Supabase Auth
- **File Handling**: Expo File System
- **Animations**: React Native Reanimated

### Key Dependencies
- `@supabase/supabase-js` - Backend services
- `@react-navigation/native` - Navigation
- `react-native-paper` - UI components
- `expo-auth-session` - OAuth authentication
- `react-native-reanimated` - Animations
- `lottie-react-native` - Lottie animations

## Authentication Flow

![Authentication Flow](images/auth-flow.png)

### Google OAuth Integration
1. User initiates Google sign-in
2. Expo Auth Session handles OAuth flow
3. Access token stored in SecureStore
4. Supabase session created with Google ID token
5. User authenticated across the app

### Token Management
- **Access Token**: Stored in SecureStore for Gmail API
- **Refresh Token**: Automatic token refresh handling
- **Session Management**: Supabase handles session persistence

## Navigation Structure

![Navigation Structure](images/navigation-structure.png)

### Stack Navigator (MainStack)
- **MainTabs**: Main tab navigation
- **CircularsScreen**: Left pop-out animation
- **CertificatesScreen**: Left pop-out animation
- **FacultyAvailabilityScreen**: Left pop-out animation
- **CGPAScreen**: Left pop-out animation
- **UserDetailsScreen**: Right pop-out animation
- **PreviewScreen**: Right pop-out animation

### Tab Navigator (MainTabs)
- **ChatBotScreen**: AI chatbot interface
- **ToolsScreen**: Academic tools hub
- **ProfileScreen**: User profile management

## Screen Implementations

### 1. ChatBotScreen
![ChatBot Implementation](images/chatbot-implementation.png)

**Key Features:**
- Real-time AI chat interface
- Gmail integration for email search
- Auto-scrolling with performance optimization
- Message streaming with typing indicators
- File attachment support
- Source citation display

**Technical Implementation:**
- Uses Supabase real-time subscriptions
- Implements throttled scroll handlers
- Dual-scroll approach for cross-platform compatibility
- Async token management for Gmail API

### 2. ToolsScreen
![Tools Implementation](images/tools-implementation.png)

**Features:**
- Navigation hub to all academic tools
- Quick access to forms, certificates, circulars
- Faculty availability checker
- CGPA calculator

### 3. ProfileScreen
![Profile Implementation](images/profile-implementation.png)

**Features:**
- User profile management
- Avatar upload with image picker
- Theme switching (light/dark mode)
- Account settings
- Sign out functionality

### 4. FacultyAvailabilityScreen
![Faculty Availability Implementation](images/faculty-availability-implementation.png)

**Features:**
- Real-time faculty status tracking
- Interactive calendar interface
- Appointment scheduling
- Status updates with notifications

### 5. CircularsScreen
![Circulars Implementation](images/circulars-implementation.png)

**Features:**
- Circular document management
- PDF viewer integration
- Search and filter functionality
- Offline caching

### 6. CertificatesScreen
![Certificates Implementation](images/certificates-implementation.png)

**Features:**
- Certificate generation and management
- Template system
- PDF export functionality
- Digital signature support

### 7. CGPAScreen
![CGPA Implementation](images/cgpa-implementation.png)

**Features:**
- CGPA calculation
- Grade tracking
- Academic performance analytics
- Export functionality

### 8. FormsScreen
![Forms Implementation](images/forms-implementation.png)

**Features:**
- Dynamic form generation
- Form submission tracking
- Document upload
- Status monitoring

### 9. UserDetailsScreen
![User Details Implementation](images/user-details-implementation.png)

**Features:**
- User registration and profile setup
- Academic information management
- Department and course selection
- Profile completion tracking

### 10. PreviewScreen
![Preview Implementation](images/preview-implementation.png)

**Features:**
- Document preview functionality
- Image and PDF viewing
- Zoom and pan controls
- Share functionality

### 11. SignInScreen
![Sign In Implementation](images/signin-implementation.png)

**Features:**
- Google OAuth integration
- Email/password authentication
- Domain validation
- Error handling and user feedback

## Data Flow & State Management

![Data Flow](images/data-flow.png)

### State Management Strategy
1. **Local State**: React useState for component-specific data
2. **Global State**: React Context for theme and user preferences
3. **Persistent Storage**: AsyncStorage for offline data
4. **Secure Storage**: SecureStore for sensitive tokens
5. **Real-time Data**: Supabase subscriptions

### Data Flow Patterns
- **Authentication**: OAuth → Token Storage → Supabase Session
- **Chat Messages**: User Input → API → Real-time Update → UI
- **File Operations**: Picker → Processing → Upload → Storage
- **Profile Updates**: Form → Validation → API → State Update

## API Integrations

![API Integrations](images/api-integrations.png)

### Supabase Integration
- **Authentication**: User management and session handling
- **Database**: Real-time data storage and retrieval
- **Storage**: File upload and management
- **Real-time**: Live updates and notifications

### Gmail API Integration
- **Search**: Email content search functionality
- **Authentication**: OAuth token management
- **Rate Limiting**: Proper API usage handling
- **Error Handling**: Graceful fallbacks

### External APIs
- **Google OAuth**: Authentication provider
- **File Processing**: PDF and image handling
- **Print Services**: Document printing capabilities

## Performance Optimizations

![Performance Optimizations](images/performance-optimizations.png)

### ChatBot Optimizations
- **Scroll Throttling**: 90% reduction in scroll handler calls
- **Smart Auto-scroll**: Conditional scrolling based on user position
- **Message Batching**: Efficient message rendering
- **Memory Management**: Proper cleanup of subscriptions

### General Optimizations
- **Image Optimization**: Compression and caching
- **Lazy Loading**: Component and data lazy loading
- **Memoization**: React.memo for expensive components
- **Bundle Splitting**: Efficient code splitting

### Platform-Specific Optimizations
- **iOS**: Native scroll behavior optimization
- **Android**: Custom scroll implementations
- **Cross-platform**: Unified API with platform-specific fallbacks

## Development Guidelines

### Code Organization
- **Screens**: Feature-based screen components
- **Components**: Reusable UI components
- **Context**: Global state management
- **Lib**: External service configurations
- **Constants**: App-wide constants and colors

### Best Practices
- **Error Handling**: Comprehensive error boundaries
- **Loading States**: Proper loading indicators
- **Accessibility**: Screen reader support
- **Testing**: Component and integration testing
- **Documentation**: Inline code documentation

## Deployment

### Build Configuration
- **Expo**: Managed workflow with custom development builds
- **Platforms**: iOS and Android support
- **Updates**: Over-the-air updates via Expo
- **Distribution**: App Store and Play Store ready

### Environment Management
- **Development**: Local development setup
- **Staging**: Test environment configuration
- **Production**: Production environment setup
- **Secrets**: Secure environment variable management

---

*This documentation provides a comprehensive overview of the KARE Bot implementation. For detailed technical specifications, refer to the individual screen documentation files.*


