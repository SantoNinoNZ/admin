# Hybrid Posts Management Guide

Your admin site now supports managing both **Database posts** (Supabase) and **Static posts** (GitHub markdown files)!

## Overview

- **New posts**: Always saved to Supabase database
- **Legacy posts**: Static markdown files from `C:\Projects\santoninonz-web\public\posts`
- **Editing**: Both types can be edited in the admin
- **Deleting**: Both types can be deleted
- **Adding**: Cannot add new static files (only database posts)

## How It Works

### Database Posts (New)
- Stored in Supabase
- Support categories, tags, and SEO metadata
- Instant updates
- Badge: 🗄️ **Database** (purple)

### Static Posts (Legacy)
- Stored as `.md` files in GitHub repository
- Changes are committed directly to GitHub
- No categories, tags, or SEO fields
- Triggers auto-rebuild of main site
- Badge: 📄 **Static File** (blue)

## Using the Admin

### Viewing Posts
All posts (database and static) appear in the same list, sorted by date. Look for the badge to see the source.

### Editing Static Posts
1. Click "Edit" on any static post
2. You'll see a blue info banner: "Editing Static Post"
3. Edit title, slug, excerpt, image URL, and content
4. Categories, tags, and SEO fields are disabled
5. Click "Save"
6. Changes are committed to GitHub with message:
   ```
   chore: update post "Your Post Title"

   Updated from admin site

   Co-Authored-By: Santo Niño Admin <noreply@santonino-nz.org>
   ```
7. Main site rebuilds automatically (~2-3 minutes)

### Deleting Static Posts
1. Click "Delete" on any static post
2. Confirm deletion
3. File is deleted from GitHub with commit message:
   ```
   chore: delete post "Your Post Title"

   Deleted from admin site

   Co-Authored-By: Santo Niño Admin <noreply@santonino-nz.org>
   ```
4. Main site rebuilds automatically

### Creating New Posts
- Click "New Post"
- All new posts go to **database only**
- Cannot create new static files

## Technical Details

### Commit Messages
All changes follow [Conventional Commits](https://www.conventionalcommits.org/):
- Updates: `chore: update post "Title"`
- Deletes: `chore: delete post "Title"`
- Always includes "Updated/Deleted from admin site"
- Co-authored by Santo Niño Admin

### GitHub Token
- The admin uses the GitHub token you set up earlier
- Same token used for auto-rebuild feature
- Has `public_repo` permission
- Stored in `.env` as `NEXT_PUBLIC_GITHUB_TOKEN`

### Frontmatter Parsing
Static posts are parsed from markdown:
```markdown
---
title: "Post Title"
date: "2026-01-10"
slug: "post-slug"
imageUrl: "/path/to/image.jpg"
excerpt: "Post description"
---

Markdown content here...
```

### Auto-Rebuild
When you edit/delete a static post:
1. Changes committed to GitHub
2. GitHub Actions detects the commit
3. Main site rebuilds with new content
4. Users see update notification after ~2-3 minutes

## Troubleshooting

### "GitHub token not configured"
- Check `.env` file has `NEXT_PUBLIC_GITHUB_TOKEN`
- Restart dev server after adding token

### "Failed to fetch static posts"
- Check GitHub token has `public_repo` permission
- Check repository name is correct: `SantoNinoNZ/SantoNinoNZ.github.io`
- Check `public/posts` directory exists in main repo

### Changes not appearing on main site
- Wait 2-3 minutes for rebuild to complete
- Check GitHub Actions: https://github.com/SantoNinoNZ/SantoNinoNZ.github.io/actions
- Users may need to hard refresh (Ctrl+Shift+R)

### Commit fails
- Check GitHub token hasn't expired
- Check you have write access to the repository
- Check the file hasn't been deleted or moved

## Benefits

✅ **Unified Interface**: Manage all posts in one place
✅ **Version Control**: All changes tracked in Git
✅ **Backwards Compatible**: Legacy posts still work
✅ **Safe Editing**: Changes committed, not lost
✅ **Auto-Rebuild**: Main site updates automatically
✅ **Clear Indicators**: Know which posts are which

## Best Practices

1. **Edit carefully**: Changes to static posts commit directly to GitHub
2. **Check badges**: Know which type of post you're editing
3. **Use database**: For new posts with full features
4. **Migrate gradually**: Move important static posts to database over time
5. **Test first**: Try editing a test static post before important ones

Enjoy your hybrid post management system! 🎉
