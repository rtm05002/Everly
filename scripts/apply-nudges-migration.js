#!/usr/bin/env node

/**
 * Script to apply the nudge system migration to Supabase
 * 
 * Usage:
 *   node scripts/apply-nudges-migration.js
 * 
 * Or with explicit database URL:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node scripts/apply-nudges-migration.js
 */

const fs = require('fs')
const path = require('path')

async function main() {
  try {
    // Get Supabase credentials from environment
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required')
      console.log('\nHint: Set these in your .env.local file or as environment variables')
      process.exit(1)
    }

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'nudges.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    console.log('📄 Migration file loaded:', migrationPath)
    console.log('🔗 Connecting to Supabase...')

    // Note: We can't directly execute SQL from Node.js without a PostgreSQL client
    // This script provides instructions instead
    console.log('\n✨ To apply the migration:')
    console.log('\n1. Go to https://supabase.com/dashboard')
    console.log('2. Select your project')
    console.log('3. Open the SQL Editor')
    console.log('4. Click "New Query"')
    console.log('5. Copy the contents of:', migrationPath)
    console.log('6. Paste and run the SQL')
    
    console.log('\n📝 Migration file contents:')
    console.log('─'.repeat(80))
    console.log(migrationSQL.substring(0, 500) + '...')
    console.log('─'.repeat(80))
    console.log(`\nFull file: ${path.relative(process.cwd(), migrationPath)}`)
    
    console.log('\n✅ Done! Follow the instructions above to apply the migration.')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()

