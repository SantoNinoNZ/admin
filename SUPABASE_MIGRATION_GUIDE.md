# Supabase Migration & Setup Guide

This guide provides two methods to set up your Supabase database: a one-click manual approach and an automated GitHub Actions workflow.

## Prerequisites

-   A Supabase account and a new project created.
-   A Google Cloud Console account for setting up Google OAuth.
-   A GitHub repository for your project.

---

## Method 1: Manual Database Setup (Recommended for first-time setup)

This method involves running a single SQL script in your Supabase dashboard. It's fast and gives you immediate feedback.

### Step 1: Run the Full Migration Script

1.  Navigate to your Supabase project dashboard.
2.  Go to the **SQL Editor** section in the left sidebar.
3.  Click **"+ New query"**.
4.  Open the `supabase/MIGRATION.sql` file in this project.
5.  Copy the **entire contents** of the file.
6.  Paste it into the Supabase SQL Editor.
7.  Click **"RUN"**.

After a few moments, you should see "✅ All migrations completed!" in the results panel. Your database is now fully set up.

### Step 2: Create the Storage Bucket

The SQL script sets up policies for a storage bucket, but you must create the bucket itself manually.

1.  Go to **Storage** in the left sidebar.
2.  Click **"New bucket"**.
3.  Enter the bucket name: `post-media`
4.  Toggle **Public bucket** to **ON**. This is crucial for images to be viewable.
5.  Click **"Create bucket"**.

---

## Method 2: Automated Migrations with GitHub Actions

This method automatically runs your database migrations whenever you push changes to the `supabase/migrations` folder. This is ideal for ongoing development after the initial setup.

### Step 1: Configure Your Supabase Project ID

1.  Open the `supabase/config.toml` file.
2.  Find the line `project_id = "your-project-id"`.
3.  Replace `"your-project-id"` with your actual Supabase Project ID. You can find this in your project's dashboard URL: `https://supabase.com/dashboard/project/<project_id>`.

### Step 2: Set GitHub Repository Secrets

The GitHub workflow needs credentials to connect to your Supabase project. You must store these as encrypted secrets in your GitHub repository.

1.  **Generate a Supabase Access Token**:
    -   Go to your Supabase Account page: [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
    -   Click **"Generate New Token"**.
    -   Give it a name (e.g., "GitHub Actions") and click **"Generate Token"**.
    -   **Copy the token immediately.** You will not be able to see it again.

2.  **Get Your Database Password**:
    -   Navigate to your Supabase Project > Settings > Database.
    -   Under **Connection info**, find the **Password**.
    -   Copy the password.

3.  **Add Secrets to GitHub**:
    -   Go to your GitHub repository > Settings > Secrets and variables > Actions.
    -   Click **"New repository secret"** for each of the following:
        -   `SUPABASE_ACCESS_TOKEN`: Paste the token you generated.
        -   `SUPABASE_DB_PASSWORD`: Paste your database password.

### Step 3: Trigger the Workflow

Commit and push the changes (including the `config.toml` and `.github/workflows/db-migrate.yml` files) to your main branch. The workflow will automatically run and apply the migrations from the `supabase/migrations` directory. You can view its progress in the "Actions" tab of your GitHub repository.

---

## Next Steps (After Database Setup)

Once your database is set up using either method, proceed with these steps.

### 1. Configure Google OAuth

Follow the steps in your Supabase Dashboard under **Authentication > Providers > Google** to set it up. You will need:
-   **Client ID** and **Client Secret** from Google Cloud Console.
-   **Authorized redirect URI**: `https://[YOUR_SUPABASE_PROJECT_ID].supabase.co/auth/v1/callback`

### 2. Set Up Environment Variables

Create a `.env.local` file in your project root with your Supabase API keys:

```env
# Get these from Supabase Dashboard > Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

### 3. Run the Application

```bash
npm run dev
```

Navigate to `http://localhost:3000` to see your application. The login has been temporarily bypassed, so you will be taken directly to the dashboard.