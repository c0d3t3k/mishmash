# Installation Guide - Mishmash Convex

This guide will walk you through setting up the Mishmash Convex application for development and production.

## 📋 Prerequisites

### Required Software
- **Node.js**: Version 18 or higher
- **Bun**: Latest version (preferred package manager)
- **Git**: For version control

### Required Accounts
- **Convex Account**: Sign up at [convex.dev](https://convex.dev)
- **Cloudflare R2**: For image storage (optional for development)
- **Resend Account**: For email functionality (optional)

## 🚀 Development Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd mishmash-convex
```

### 2. Install Bun (if not already installed)
```bash
# On macOS/Linux
curl -fsSL https://bun.sh/install | bash

# On Windows
powershell -c "irm bun.sh/install.ps1 | iex"

# Verify installation
bun --version
```

### 3. Install Dependencies
```bash
bun install
```

### 4. Set Up Convex

#### Install Convex CLI
```bash
bun x convex dev --once
```

#### Initialize Convex Project
If this is your first time setting up the project:
```bash
# Follow the prompts to create a new Convex project
bun x convex dev
```

This will:
- Create a new Convex project (if needed)
- Generate your deployment URL
- Set up authentication
- Deploy your schema and functions

### 5. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Convex Configuration (required)
VITE_CONVEX_URL=https://your-deployment-url.convex.cloud

# Optional: Custom site URL for sharing
SITE_URL=http://localhost:3000

# Optional: Cloudflare R2 Configuration
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET_NAME=your-bucket-name
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com

# Optional: Resend Configuration (for email sharing)
RESEND_API_KEY=your-resend-api-key
```

### 6. Configure Authentication

The app uses `@convex-dev/auth` for authentication. Configure your auth providers in `convex/auth.config.ts`:

```typescript
// Example configuration is already set up
// Supports email/password and Google OAuth
```

For Google OAuth, you'll need to:
1. Create a Google Cloud Project
2. Enable the Google+ API
3. Create OAuth 2.0 credentials
4. Add your credentials to Convex environment variables

### 7. Start Development Server
```bash
# Start both Convex backend and Vite frontend
bun run dev
```

The application will be available at `http://localhost:3000`.

### 8. Verify Setup

1. **Database**: Check that Convex is running and tables are created
2. **Authentication**: Try signing up/signing in
3. **File Upload**: Test image upload functionality
4. **Canvas**: Create a collage and add images

## 🏗️ Production Deployment

### Convex Deployment
```bash
# Deploy to production
bun x convex deploy

# Set production environment variables
bun x convex env set SITE_URL https://your-domain.com
bun x convex env set CLOUDFLARE_R2_ACCESS_KEY_ID your-key
# ... add other production variables
```

### Frontend Deployment

The frontend can be deployed to various platforms:

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

#### Netlify
```bash
# Build the project
bun run build

# Deploy the dist/ folder to Netlify
```

#### Self-hosted
```bash
# Build for production
bun run build

# Serve the dist/ folder with your web server
```

## 🔧 Configuration Details

### Convex Schema
The database schema is defined in `convex/schema.ts` with three main tables:
- `collages`: Collage metadata and settings
- `images`: Individual images with positioning data
- `sharedCollages`: Public sharing records

### File Storage
- **Development**: Files are stored in Convex's built-in file storage
- **Production**: Recommended to use Cloudflare R2 for better performance and cost

### Authentication Providers
Currently supported:
- Email/password

To add more providers, modify `convex/auth.config.ts`.

### AI Models
The app uses Hugging Face Transformers.js models:
- **RMBG-1.4**: Default background removal model
- **MODNet**: Alternative model with WebGPU support

Models are loaded on-demand from Hugging Face CDN.

## 🧪 Development Commands

```bash
# Start development server
bun run dev

# Build for production
bun run build

# Type checking
bun run type-check

# Start ngrok proxy (for testing webhooks)
bun run ngrok

# Install Serena MCP server (for AI assistance)
bun run serena:install
```

## 🐛 Troubleshooting

### Common Issues

#### Convex Connection Issues
```bash
# Check Convex status
bun x convex dev --once

# Reset Convex configuration
rm -rf .convex
bun x convex dev
```

#### Build Errors
```bash
# Clear node modules and reinstall
rm -rf node_modules bun.lockb
bun install

# Clear build cache
rm -rf dist
bun run build
```

#### Authentication Issues
- Verify your auth configuration in `convex/auth.config.ts`
- Check environment variables are set correctly
- Ensure OAuth credentials are valid

#### File Upload Issues
- Check Cloudflare R2 credentials
- Verify bucket permissions
- Test with smaller file sizes first

### Performance Optimization

#### Development
- Use `bun` instead of `npm` for faster package management
- Enable React DevTools for debugging
- Use browser dev tools for performance profiling

#### Production
- Enable Cloudflare R2 for file storage
- Configure CDN for static assets
- Optimize images before upload
- Use WebGPU when available for AI processing

## 📚 Additional Resources

- [Convex Documentation](https://docs.convex.dev/)
- [React Flow Documentation](https://reactflow.dev/)
- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/)

## 🔒 Security Considerations

### Environment Variables
- Never commit `.env.local` to version control
- Use different credentials for development and production
- Rotate API keys regularly

### Authentication
- Use strong passwords for admin accounts
- Enable 2FA where possible
- Review OAuth application permissions

### File Storage
- Configure proper CORS settings for R2
- Use signed URLs for private content
- Implement file size and type restrictions

---

Need help? Check the main README.md or create an issue in the repository. 