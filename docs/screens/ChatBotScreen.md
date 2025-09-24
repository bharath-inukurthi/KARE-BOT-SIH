# ChatBotScreen Implementation

## Overview

The ChatBotScreen is the core AI interface of the KARE Bot application, providing real-time chat functionality with Gmail integration, auto-scrolling optimization, and comprehensive message handling.

![ChatBot Implementation](../images/chatbot-implementation.png)

## Architecture

### Component Structure
```
ChatBotScreen
├── Header (Navigation + Settings)
├── MessageList (FlatList with optimized rendering)
├── InputArea (Text input + Attachments)
├── TypingIndicator (AI response animation)
└── ScrollToBottom (Auto-scroll control)
```

### State Management
The screen manages several key states:
- **Messages**: Array of chat messages with metadata
- **Input Text**: Current user input
- **Loading States**: Various loading indicators
- **Scroll Metrics**: Scroll position and behavior tracking
- **Gmail Integration**: Authentication and search results
- **UI States**: Typing indicators and scroll controls

## Key Features

### 1. Real-time Chat Interface
- **Supabase Integration**: Real-time message synchronization across devices
- **Message Streaming**: Progressive response display as AI generates content
- **Typing Indicators**: Visual feedback during AI processing
- **Message Persistence**: Offline message storage and synchronization

### 2. Gmail Integration
- **Email Search**: Search through user's Gmail messages for context
- **Token Management**: Secure OAuth token handling and refresh
- **Source Citations**: Link AI responses to relevant email sources
- **Error Handling**: Graceful fallbacks when Gmail access is unavailable

### 3. Auto-scrolling Optimization
- **Smart Scrolling**: Conditional auto-scroll based on user position
- **Throttled Handlers**: 90% reduction in scroll event calls for performance
- **Cross-platform**: Unified scrolling behavior for iOS and Android
- **Performance**: Optimized for handling large message lists

### 4. File Attachments
- **Image Picker**: Native image selection from gallery or camera
- **File Upload**: Supabase storage integration with progress tracking
- **Preview**: In-app file preview with zoom capabilities
- **Sharing**: Native share functionality for files and messages

## Technical Implementation

### Message Handling Flow
1. **Input Validation**: Check message content and attachments
2. **File Processing**: Upload attachments to cloud storage
3. **AI Processing**: Send message to AI API with context
4. **Streaming Response**: Handle progressive response updates
5. **UI Updates**: Update interface in real-time
6. **Database Storage**: Persist messages for history

### Gmail API Integration Flow
1. **Token Retrieval**: Get stored OAuth token from secure storage
2. **Token Validation**: Check token expiry and refresh if needed
3. **Search Execution**: Query Gmail API for relevant messages
4. **Result Processing**: Parse and format search results
5. **Source Linking**: Connect AI responses to email sources
6. **Error Handling**: Manage API failures and rate limits

### Auto-scroll System Flow
1. **Scroll Tracking**: Monitor user scroll position and behavior
2. **Position Analysis**: Determine if user is near bottom
3. **Auto-scroll Decision**: Decide when to auto-scroll
4. **Smooth Animation**: Execute smooth scroll to bottom
5. **Button Management**: Show/hide scroll-to-bottom button

## Performance Optimizations

### 1. Scroll Optimization
- **Throttling**: Limit scroll event frequency to 100ms intervals
- **Conditional Rendering**: Only render messages currently visible
- **Memory Management**: Proper cleanup of event listeners and subscriptions

### 2. Message Rendering
- **FlatList Optimization**: Efficient list rendering with virtualization
- **Memoization**: Prevent unnecessary re-renders of message components
- **Batch Updates**: Group state updates to minimize re-renders

### 3. API Calls
- **Debouncing**: Delay search requests until user stops typing
- **Caching**: Store Gmail search results to reduce API calls
- **Error Recovery**: Automatic retry mechanisms for failed requests

## Error Handling

### Network Error Handling
- **Offline Detection**: Detect network connectivity issues
- **Message Queuing**: Queue messages for retry when online
- **User Feedback**: Clear error messages and retry options

### Gmail API Error Handling
- **Token Refresh**: Automatic token refresh on authentication errors
- **Rate Limiting**: Handle API rate limits gracefully
- **Fallback Mode**: Continue without Gmail when unavailable

### Message Processing Error Handling
- **Input Validation**: Prevent invalid message submissions
- **File Upload Errors**: Handle upload failures with retry options
- **AI Service Errors**: Graceful handling of AI service failures

## UI/UX Features

### 1. Message Bubbles
- **User Messages**: Right-aligned with blue background
- **AI Messages**: Left-aligned with gray background
- **System Messages**: Centered with info styling
- **Error Messages**: Red styling with retry and help options

### 2. Input Area
- **Text Input**: Multi-line text input with character limits
- **Attachment Button**: Easy access to image picker
- **Send Button**: Disabled during processing to prevent spam
- **Character Count**: Visual feedback on input length

### 3. Loading States
- **Typing Indicator**: Animated dots during AI response generation
- **Upload Progress**: Progress bars for file uploads
- **Skeleton Loading**: Placeholder animations for message loading

### 4. Navigation
- **Scroll to Bottom**: Floating action button for quick navigation
- **Message Search**: In-chat search functionality
- **Settings**: Chat preferences and Gmail configuration

## Data Flow

The ChatBotScreen follows this data flow:
1. **User Input** → Input validation and processing
2. **File Upload** → Cloud storage upload with progress tracking
3. **AI API Call** → Send message to AI service with context
4. **Stream Response** → Handle progressive response updates
5. **UI Update** → Update interface in real-time
6. **Database Save** → Persist messages for history and sync

For Gmail integration:
1. **Search Request** → Validate token and search Gmail
2. **Result Processing** → Parse and format search results
3. **Source Linking** → Connect AI responses to email sources
4. **Display** → Show sources with clickable links

## Testing Strategy

### Unit Testing
- Message processing functions and validation
- Gmail API integration and error handling
- Scroll optimization logic and performance
- Error handling scenarios and edge cases

### Integration Testing
- End-to-end chat flow from input to response
- Gmail integration workflow and token management
- File upload process and progress tracking
- Real-time synchronization across devices

### Performance Testing
- Scroll performance with large message lists
- Memory usage during extended chat sessions
- Network resilience and offline functionality
- Cross-platform compatibility and behavior

## Future Enhancements

### Planned Features
- **Voice Messages**: Audio recording and playback capabilities
- **Rich Media**: Support for videos, documents, and presentations
- **Message Reactions**: Emoji reactions and message interactions
- **Chat History**: Advanced search and filtering capabilities
- **Offline Mode**: Enhanced offline functionality with sync

### Technical Improvements
- **WebSocket**: Direct WebSocket connections for real-time updates
- **Message Encryption**: End-to-end encryption for privacy
- **Push Notifications**: Real-time notifications for new messages
- **Analytics**: Usage analytics and performance insights

---

*This documentation covers the complete implementation flow of the ChatBotScreen. For specific technical details, refer to the source code and inline comments.*