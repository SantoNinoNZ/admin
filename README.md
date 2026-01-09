# Santo Niño Admin Interface

A comprehensive Content Management System (CMS) for [santoninonz.github.io](https://santoninonz.github.io) built with Next.js and deployed on GitHub Pages.

## 🌐 Live Admin Interface

**URL:** [https://santoninonz.github.io/admin/](https://santoninonz.github.io/admin/)

## 🎯 Purpose

This admin interface allows content managers to:
- Create, edit, and delete blog posts stored as Markdown files
- Upload and manage images directly to the GitHub repository
- Preview posts in real-time with a rich markdown editor
- Manage all content without requiring technical knowledge
- Maintain version control through GitHub's infrastructure

## ✨ Features

### 🔐 **Secure Authentication**
- GitHub Personal Access Token authentication
- No server-side authentication required
- Direct GitHub API integration

### 📝 **Content Management**
- Rich markdown editor with live preview
- YAML frontmatter support (title, date, excerpt, imageUrl)
- Automatic slug generation from titles
- Content validation and error handling

### 🖼️ **Media Management**
- Drag & drop image uploads
- Automatic file naming with timestamps
- Direct upload to GitHub repository
- Image path management for posts

### 📱 **Modern Interface**
- Responsive design for mobile and desktop
- Dark theme matching main site aesthetics
- Real-time feedback for all operations
- Intuitive navigation and controls

### 🚀 **Zero-Cost Deployment**
- Deployed on GitHub Pages (free)
- No server maintenance required
- Automatic deployment via GitHub Actions
- Static site generation for optimal performance

## 🏗️ Architecture

### Repository Structure
```
SantoNinoNZ/
├── santoninonz.github.io/        # Main website
│   ├── public/posts/             # Blog posts (Markdown)
│   │   ├── *.md                  # Individual posts
│   │   └── assets/images/        # Post images
│   └── src/                      # Main site code
│
└── admin/                        # This admin interface
    ├── src/
    │   ├── app/                  # Next.js App Router
    │   ├── components/           # React components
    │   ├── lib/                  # API integrations
    │   └── types/                # TypeScript definitions
    └── docs/                     # Project documentation
```

### Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **Next.js** | React framework with App Router | 16.1.1 |
| **TypeScript** | Type-safe development | 5.9.3 |
| **Tailwind CSS** | Utility-first styling | 4.1.18 |
| **React MDX Editor** | Rich markdown editing | 4.0.11 |
| **Lucide React** | Icon library | 0.562.0 |
| **js-base64** | Base64 encoding for GitHub API | 3.7.8 |
| **GitHub API** | Repository management | v3 REST API |

## 🚀 Quick Start

### Prerequisites
1. GitHub account with access to `SantoNinoNZ` organization
2. Personal Access Token with `repo` scope

### Getting Started
1. **Access the admin interface:**
   ```
   https://santoninonz.github.io/admin/
   ```

2. **Authenticate:**
   - Enter your GitHub Personal Access Token
   - The interface will verify your access to the main repository

3. **Start managing content:**
   - View existing posts in the dashboard
   - Click "New Post" to create content
   - Edit existing posts by clicking the edit button

### Authentication Options

#### Option 1: Quick Sign In (Recommended)
1. Click **"Quick Sign In"** on the admin interface
2. Scan the QR code with your phone or click the verification link
3. Authorize the Santo Niño Admin app on GitHub
4. You're automatically logged in!

#### Option 2: Personal Access Token (Advanced)
1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Set expiration and select scopes:
   - ✅ **repo** (Full control of private repositories)
4. Generate and copy the token
5. Choose "Personal Access Token" option in the admin interface

**Note**: Quick Sign In requires a GitHub App to be set up. See [GitHub App Setup Guide](./docs/GITHUB_APP_SETUP.md) for initial configuration.
## 📖 Content Management Guide

### Creating a New Post

1. **Click "New Post"** in the dashboard
2. **Fill in metadata:**
   - **Title**: Post title (slug auto-generated)
   - **Date**: Publication date (defaults to today)
   - **Excerpt**: Brief description for previews
   - **Featured Image**: URL or upload an image

3. **Write content** using the markdown editor:
   ```markdown
   # Your Post Title

   This is your post content with **bold text** and *italic text*.

   ## Subheading

   - Bullet points
   - More items

   ![Image description](image-url)
   ```

4. **Save the post** - it will be committed to the GitHub repository

### Post Frontmatter
Each post includes YAML frontmatter:
```yaml
---
title: "Your Post Title"
date: "2024-01-15"
excerpt: "Brief description of the post"
imageUrl: "/posts/assets/images/your-image.jpg"
---
```

### Image Management
- **Upload**: Drag & drop or click upload button
- **Automatic naming**: `timestamp-filename.ext`
- **Storage location**: `public/posts/assets/images/`
- **URL format**: `/posts/assets/images/filename.ext`

## 🛠️ Development

### Local Development Setup
```bash
# Clone the repository
git clone https://github.com/SantoNinoNZ/admin.git
cd admin

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

### Available Scripts
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run export     # Export static files
npm run deploy     # Build and prepare for GitHub Pages
```

### Environment Configuration
- **Base Path**: `/admin` (for GitHub Pages deployment)
- **Asset Prefix**: `/admin` (for static assets)
- **Output**: Static export for GitHub Pages
- **Images**: Unoptimized (required for static export)

## 📁 File Structure

```
src/
├── app/
│   ├── layout.tsx           # Root layout with global styles
│   └── page.tsx             # Main application entry point
│
├── components/
│   ├── GitHubAuth.tsx       # Authentication component
│   ├── Dashboard.tsx        # Main dashboard with user info
│   ├── PostList.tsx         # Post listing with edit/delete
│   └── PostEditor.tsx       # Rich markdown editor
│
├── lib/
│   └── github-api.ts        # GitHub API integration class
│
├── types/
│   └── index.ts             # TypeScript type definitions
│
└── styles/
    └── globals.css          # Global styles and Tailwind imports
```

## 🔧 Configuration Files

- **`next.config.js`**: Next.js configuration for GitHub Pages
- **`tailwind.config.js`**: Tailwind CSS configuration
- **`tsconfig.json`**: TypeScript configuration
- **`.github/workflows/deploy.yml`**: GitHub Actions deployment workflow

## 🚀 Deployment

### Automatic Deployment
- **Trigger**: Push to `main` branch
- **Platform**: GitHub Pages
- **Process**: GitHub Actions builds and deploys automatically
- **URL**: `https://santoninonz.github.io/admin/`

### Manual Deployment
```bash
npm run build          # Build the application
npm run export         # Generate static files
# Files are output to ./out/ directory
```

## 🔒 Security Considerations

1. **Token Security**: Personal Access Tokens are stored in localStorage (client-side only)
2. **Repository Access**: Only users with appropriate GitHub permissions can use the admin
3. **API Rate Limits**: GitHub API limits apply (5000 requests/hour for authenticated users)
4. **No Server**: No backend server reduces attack surface

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify token has `repo` scope
   - Check token hasn't expired
   - Ensure access to `SantoNinoNZ` organization

2. **Build Errors**
   - Run `npm install` to update dependencies
   - Check Next.js and TypeScript versions
   - Verify all required files are present

3. **Image Upload Issues**
   - Check file size (GitHub has limits)
   - Verify image file format is supported
   - Ensure GitHub token has write permissions

### Support
For issues or questions:
1. Check the [GitHub Issues](https://github.com/SantoNinoNZ/admin/issues)
2. Review the documentation in `/docs/`
3. Contact the development team

## 📚 Additional Documentation

- [**Development Guide**](./docs/DEVELOPMENT.md) - Detailed development setup and workflows
- [**API Documentation**](./docs/API.md) - GitHub API integration details
- [**Deployment Guide**](./docs/DEPLOYMENT.md) - Step-by-step deployment instructions
- [**Architecture Overview**](./docs/ARCHITECTURE.md) - System design and decision rationale

## 📄 License

This project is part of the Santo Niño NZ website infrastructure and follows the same licensing terms as the main website.