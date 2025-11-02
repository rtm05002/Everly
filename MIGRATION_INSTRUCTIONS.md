# Database Migration Instructions

## Apply Nudge System Migration

To enable the full nudge system, you need to run the SQL migration on your Supabase database.

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `supabase/nudges.sql` and paste into the editor
5. Click **Run** (or press `Ctrl+Enter` on Windows, `Cmd+Enter` on Mac)

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Make sure you're logged in
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run the migration
supabase db push --file supabase/nudges.sql
```

### What This Migration Creates

- **Tables**: `nudge_recipes`, `nudge_runs`, `nudge_messages`, `member_preferences`
- **Indexes**: For fast queries by hub, recipe, member, and time
- **RLS Policies**: Secure access control for creators and members
- **Default Values**: Safe defaults for frequency caps and DND windows

### Verify Migration

After running the migration, verify the tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'nudge%';
```

You should see:
- nudge_recipes
- nudge_runs
- nudge_messages
- member_preferences

### Troubleshooting

**Error: "relation already exists"**
- The tables already exist. Safe to ignore.

**Error: "function auth_claim does not exist"**
- Run `supabase/policies.sql` first to create the helper function.

**Error: "foreign key constraint violations"**
- Make sure your `hubs` and `members` tables exist first.

## Next Steps

After migration:
1. Restart your development server
2. Navigate to the AI Assistant page
3. Your nudge recipes will persist to the database
4. Try creating, editing, and running nudges!

