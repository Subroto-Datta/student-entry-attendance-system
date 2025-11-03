# AWS Amplify Setup Guide

This guide explains how to deploy the React frontend to AWS Amplify Hosting.

## Prerequisites

- React frontend code in a Git repository (GitHub, GitLab, or Bitbucket)
- AWS Account
- Completed backend setup (API Gateway endpoints ready)

## Method 1: Deploy via AWS Amplify Console

### Step 1: Push Code to Git Repository

If not already done:

```bash
cd frontend
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-git-repo-url>
git push -u origin main
```

### Step 2: Create Amplify App

1. Go to **AWS Amplify Console**
2. Click **New app** → **Host web app**
3. Choose your Git provider (GitHub, GitLab, Bitbucket, or AWS CodeCommit)
4. **Authorize** AWS Amplify to access your repository
5. Select repository and branch (e.g., `main`)
6. Click **Next**

### Step 3: Configure Build Settings

Amplify should auto-detect React. Verify build settings:

**App name**: `attendance-management-frontend`

**Build specification** (amplify.yml):

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/dist
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
```

**Or if frontend is at root:**

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Step 4: Configure Environment Variables

1. Click **Advanced settings**
2. Under **Environment variables**, add:

```
VITE_API_BASE_URL=https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod
```

Replace `YOUR-API-ID` with your actual API Gateway ID.

### Step 5: Deploy

1. Click **Save and deploy**
2. Amplify will:
   - Clone your repository
   - Install dependencies
   - Build the app
   - Deploy to Amplify hosting
3. Wait for deployment to complete (5-10 minutes)

### Step 6: Access Your App

Once deployed, you'll get a URL like:
```
https://main.d1234567890abc.amplifyapp.com
```

## Method 2: Deploy via Amplify CLI

### Step 1: Install Amplify CLI

```bash
npm install -g @aws-amplify/cli
```

### Step 2: Initialize Amplify

```bash
cd frontend
amplify init
```

Follow prompts:
- **Project name**: `attendance-management-frontend`
- **Environment**: `dev` or `prod`
- **Default editor**: Your preferred editor
- **Type of app**: `javascript`
- **Framework**: `react`
- **Source directory**: `.` (or `src`)
- **Distribution directory**: `dist`
- **Build command**: `npm run build`
- **Start command**: `npm run dev`

### Step 3: Add Hosting

```bash
amplify add hosting
```

Choose:
- **Hosting with Amplify Console**
- **Manual deployment**

### Step 4: Configure Environment Variables

Create `frontend/.env`:

```
VITE_API_BASE_URL=https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod
```

### Step 5: Publish

```bash
amplify publish
```

This will:
1. Build your app
2. Deploy to Amplify hosting
3. Provide you with the app URL

## Method 3: Deploy Static Build to S3 + CloudFront

Alternative to Amplify (more control, but manual setup):

### Step 1: Build React App

```bash
cd frontend
npm install
npm run build
```

### Step 2: Create S3 Bucket for Static Hosting

1. Create S3 bucket: `attendance-frontend-<your-id>`
2. **Properties** → **Static website hosting** → **Enable**
3. Index document: `index.html`
4. Error document: `index.html` (for React Router)

### Step 3: Upload Build Files

```bash
aws s3 sync dist/ s3://attendance-frontend-<your-id>/ --delete
```

### Step 4: Make Bucket Public (Optional)

Or use CloudFront for better security (recommended).

### Step 5: Create CloudFront Distribution

1. **CloudFront** → **Create distribution**
2. Origin domain: Select your S3 bucket
3. Viewer protocol policy: **Redirect HTTP to HTTPS**
4. Default root object: `index.html`
5. Create distribution
6. Use CloudFront URL instead of S3 URL

## Environment Variables Configuration

### Development

Create `frontend/.env.local`:

```
VITE_API_BASE_URL=http://localhost:3000/api
```

### Production

Set in Amplify Console or via CLI:

```bash
amplify env add
# Or in Amplify Console → App settings → Environment variables
```

## Custom Domain Setup (Optional)

### Via Amplify Console

1. **App settings** → **Domain management**
2. Click **Add domain**
3. Enter your domain name
4. Follow DNS configuration steps
5. Amplify will provision SSL certificate automatically

## CI/CD with Amplify

Amplify automatically:
- Detects Git pushes
- Triggers builds
- Deploys to staging/production
- Provides preview deployments for pull requests

## Cost Optimization (Free Tier)

- **Amplify Hosting Free Tier**: 5 GB storage, 15 GB served per month (first 12 months)
- **Build minutes**: 1,000 minutes/month (first 12 months)
- After free tier: Pay per GB storage and data transfer

## Troubleshooting

### Build Fails

- Check build logs in Amplify Console
- Verify `package.json` has all dependencies
- Ensure build command is correct
- Check Node.js version (Amplify uses Node 18 by default)

### API Calls Fail (CORS)

- Verify API Gateway CORS is configured (see `api_gateway_setup.md`)
- Check API_BASE_URL environment variable
- Verify API Gateway URL is correct

### 404 Errors on Routes

- Ensure error document in S3/Amplify is `index.html`
- For S3: Enable static website hosting with proper redirect rules
- For CloudFront: Configure error pages to redirect to `index.html`

### Environment Variables Not Working

- Verify variables start with `VITE_` prefix (for Vite)
- Rebuild after changing environment variables
- Check Amplify Console → App settings → Environment variables

## Monitoring

- **Amplify Console** → **Monitoring**: View build history, deployment status
- **AWS CloudWatch**: Monitor app performance (if enabled)
- **Amplify Analytics** (optional): Track user interactions

## Next Steps

1. Test deployed frontend
2. Configure custom domain (optional)
3. Set up monitoring and alerts
4. Enable authentication (AWS Cognito) if needed

## Alternative: Netlify / Vercel

You can also deploy to:
- **Netlify**: Free tier with continuous deployment
- **Vercel**: Free tier for personal projects
- Both support environment variables and custom domains

