# SHAREit - Modern File & Text Sharing Platform

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green.svg)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Storage-orange.svg)](https://supabase.com/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3.1-purple.svg)](https://getbootstrap.com/)
[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen.svg)](https://shareit-lite.netlify.app)

A modern, elegant file and text sharing platform built with React and Node.js. Share files and text snippets effortlessly with drag-and-drop uploads, real-time synchronization, and a beautiful dark theme interface.

## 🌐 Live Demo

**Try it now: [shareit-lite.netlify.app](https://shareit-lite.netlify.app)**

Experience the modern UI/UX improvements including dark theme, drag-and-drop uploads, responsive design, and smooth animations in action!

## ✨ Features

### 📁 **File Management**
- **Drag & Drop Upload** - Intuitive file uploading with visual feedback
- **Multiple File Support** - Upload multiple files simultaneously
- **File Type Recognition** - Automatic file type detection with appropriate icons
- **Cloud Storage** - Secure file storage using Supabase
- **Download & Preview** - Easy file access and preview options
- **File Management** - Delete files with confirmation dialogs

### 📝 **Text Management**
- **Rich Text Storage** - Save text snippets, notes, and code
- **URL Detection** - Automatic link recognition with external navigation
- **Copy to Clipboard** - One-click copying functionality
- **Text Editing** - Modal-based editing with improved UX
- **Text Previews** - Smart truncation and content type detection

### 🎨 **Modern UI/UX**
- **Dark Theme** - Elegant minimalist design with deep neutrals
- **Skeleton UI Principles** - Clean lines, spacious layouts, rounded corners
- **Responsive Design** - Mobile-first approach with tablet and desktop optimization
- **Smooth Animations** - Subtle transitions and hover effects
- **Loading States** - Visual feedback for all async operations

### ♿ **Accessibility & Performance**
- **WCAG Compliant** - High contrast ratios and ARIA labels
- **Keyboard Navigation** - Full keyboard accessibility support
- **Focus Indicators** - Clear visual focus states
- **Screen Reader Support** - Semantic HTML structure
- **Optimized Performance** - Efficient animations and asset loading

## 🛠 Tech Stack

### Frontend
- **React 18.2.0** - Modern React with hooks
- **React Router** - Client-side routing
- **Bootstrap 5.3.1** - UI framework (customized)
- **Boxicons** - Modern icon library
- **Inter Font** - Professional typography

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Supabase** - Database and file storage
- **RESTful API** - Clean API architecture

### Design System
- **CSS Custom Properties** - Consistent theming
- **Mobile-First Design** - Responsive across all devices
- **Component Architecture** - Reusable design components

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ashwani2529/SHAREit.git
   cd SHAREit
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Setup**
   
   Create `.env` file in the frontend directory:
   ```env
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Start the development servers**
   
   Backend (Terminal 1):
   ```bash
   cd backend
   npm start
   ```
   
   Frontend (Terminal 2):
   ```bash
   cd frontend
   npm start
   ```

6. **Access the application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000` (or your configured port)

## 📱 Usage

### File Sharing
1. Navigate to the **Files** section
2. **Drag and drop** files or click to browse
3. Click **Upload** to store files in the cloud
4. **Manage files** with download, preview, and delete options

### Text Management
1. Go to the **Text** section
2. **Add text snippets**, URLs, or notes
3. **Copy content** to clipboard with one click
4. **Edit or delete** entries as needed
5. **External links** open automatically in new tabs

### Navigation
- **Responsive menu** adapts to screen size
- **Active page indicators** show current location
- **Smooth transitions** between sections

## 🎨 Design Highlights

### Color Palette
- **Primary**: Indigo (`#6366f1`) - Action buttons and links
- **Secondary**: Emerald (`#10b981`) - Success states
- **Background**: Deep Slate (`#0f172a`) - Main background
- **Surface**: Slate (`#1e293b`) - Card backgrounds
- **Text**: High contrast whites and grays

### Typography
- **Inter font family** for exceptional readability
- **Responsive scaling** from mobile to desktop
- **Proper hierarchy** with balanced weights

### Components
- **Card-based layouts** with subtle shadows
- **Button variants** for different actions
- **Form controls** with focus states
- **Loading animations** with spinners

## 📂 Project Structure

```
SHAREit/
├── backend/                 # Node.js/Express backend
│   ├── index.js            # Main server file
│   ├── package.json        # Backend dependencies
│   └── package-lock.json   # Lock file
├── frontend/               # React frontend
│   ├── public/            # Static assets
│   ├── src/               # Source code
│   │   ├── components/    # React components
│   │   │   ├── Files.js   # File management
│   │   │   ├── Page.js    # Navigation & hero
│   │   │   └── Text.js    # Text management
│   │   ├── App.js         # Main app component
│   │   ├── App.css        # Component styles
│   │   └── index.css      # Global styles & design system
│   ├── package.json       # Frontend dependencies
│   └── package-lock.json  # Lock file
└── README.md              # This file
```

## 🔧 API Endpoints

### Files
- `POST /uploaddocument` - Upload files
- `GET /fetchdocuments` - Retrieve all files
- `DELETE /deletedocument/:filename` - Delete specific file

### Text
- `POST /texts` - Create new text entry
- `GET /texts` - Retrieve all text entries
- `PUT /texts/:id` - Update text entry
- `DELETE /texts/:id` - Delete text entry

## 🚦 Development

### Running Tests
```bash
# Frontend tests
cd frontend
npm test

# Backend tests (if available)
cd backend
npm test
```

### Building for Production
```bash
# Build frontend
cd frontend
npm run build

# The build folder will contain optimized production files
```

### Deployment
The application is designed to work with:
- **Frontend**: Netlify, Vercel, or any static hosting
- **Backend**: Render, Heroku, or any Node.js hosting
- **Database**: Supabase for backend services

## 🎯 Recent Improvements

### UI/UX Transformation
- ✅ **Modern Dark Theme** - Elegant minimalist design
- ✅ **Skeleton UI Principles** - Clean, spacious layouts
- ✅ **Responsive Design** - Mobile-first approach
- ✅ **Accessibility Compliance** - WCAG standards
- ✅ **Performance Optimization** - Smooth animations
- ✅ **Enhanced UX** - Drag-and-drop, loading states, confirmations

### Technical Enhancements
- ✅ **Design System** - CSS custom properties
- ✅ **Component Architecture** - Reusable components
- ✅ **Modern React Patterns** - Hooks and best practices
- ✅ **Typography Upgrade** - Inter font integration
- ✅ **Icon System** - Boxicons integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **React Team** - For the amazing framework
- **Supabase** - For backend-as-a-service
- **Inter Font** - For beautiful typography
- **Boxicons** - For the comprehensive icon set
- **Bootstrap** - For the foundational UI components

---

**Made with ❤️ for modern file and text sharing**

*For support or questions, please open an issue in the repository.* 
