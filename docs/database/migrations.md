# Database Migration Strategies and Procedures

## Overview

This document covers database migration strategies, schema evolution patterns, and deployment procedures for Pak.Chat's Convex database. Since Convex handles many traditional migration concerns automatically, this focuses on application-level migration strategies, data transformation patterns, and deployment best practices.

## Convex Migration Architecture

### Convex Schema Management
- **Auto-sync**: Schema changes deployed automatically with code
- **Type Safety**: TypeScript compilation prevents breaking changes
- **Zero Downtime**: Live schema updates without service interruption
- **Version Control**: Schema versioned with application code

### Current Migration Status
- **Schema Version**: Implicit versioning through git commits
- **Migration System**: Application-level data transformations
- **Backward Compatibility**: Optional fields and graceful degradation

## Schema Evolution Patterns

### 1. Adding Fields (Safe Operation)

#### Pattern: Optional Field Addition
```typescript
// /convex/schema.ts:15-43 - Example from userSettings table
userSettings: defineTable({
  userId: v.id("users"),
  encryptedApiKeys: v.string(),
  // ... existing fields ...
  
  // New fields added as optional
  imageGenerationModel: v.optional(v.string()),        // Added: v1.2.0
  imageGenerationSize: v.optional(v.string()),         // Added: v1.2.0
  imageGenerationQuality: v.optional(v.string()),      // Added: v1.2.0
  imageGenerationCount: v.optional(v.number()),        // Added: v1.2.0
  imageGenerationFormat: v.optional(v.string()),       // Added: v1.2.0
  imageGenerationCompression: v.optional(v.number()),  // Added: v1.2.0
}).index("by_user", ["userId"])
```

**Implementation Strategy**:
```typescript
// Safe field addition pattern
export const saveImageGenerationSettings = mutation({
  args: {
    imageGenerationModel: v.optional(v.string()),
    imageGenerationSize: v.optional(v.string()),
    // ... other new fields
  },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error('Unauthenticated');
    
    // Validation for new fields
    if (args.imageGenerationModel && args.imageGenerationModel !== 'gpt-image-1') {
      throw new Error('Invalid image generation model');
    }
    
    const existing = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', uid))
      .unique();
      
    if (existing) {
      // Update only provided fields
      await ctx.db.patch(existing._id, {
        ...(args.imageGenerationModel !== undefined && { imageGenerationModel: args.imageGenerationModel }),
        // ... other conditional updates
      });
    } else {
      // Create with default values
      await ctx.db.insert('userSettings', {
        userId: uid,
        encryptedApiKeys: '',
        imageGenerationModel: args.imageGenerationModel,
        // ... other fields
      });
    }
  },
});
```

### 2. Deprecating Fields (Gradual Removal)

#### Pattern: Comment-Based Deprecation
```typescript
// /convex/schema.ts:28-29
// DEPRECATED: saveRegenerationHistory - no longer used
saveRegenerationHistory: v.optional(v.boolean()),
```

**Migration Strategy**:
1. **Phase 1**: Mark field as deprecated in comments
2. **Phase 2**: Stop writing to field in application code
3. **Phase 3**: Remove field usage from queries
4. **Phase 4**: Remove field from schema (future release)

#### Deprecation Implementation
```typescript
// Query handler with deprecated field handling
export const get = query({
  async handler(ctx) {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", uid))
      .unique();
    
    if (settings) {
      // Omit deprecated fields from response
      const { saveRegenerationHistory, ...activeSettings } = settings;
      return activeSettings;
    }
    
    return null;
  },
});
```

### 3. Index Evolution

#### Adding New Indexes
```typescript
// /convex/schema.ts:75-76
threads: defineTable({
  // ... fields ...
})
  .index("by_user_and_time", ["userId", "createdAt"])    // Original index
  .searchIndex("by_title", { searchField: "title" })     // Added: v1.1.0
```

**Safe Index Addition Process**:
1. Add new index to schema
2. Deploy schema update
3. Convex automatically builds index
4. Update queries to use new index

#### Index Migration Example
```typescript
// Before: Manual filtering
export const search = query({
  args: { searchQuery: v.string() },
  async handler(ctx, args) {
    const all = await ctx.db
      .query("threads")
      .withIndex("by_user_and_time", (q) => q.eq("userId", uid))
      .collect();
    
    // Client-side filtering (slow)
    return all.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
  },
});

// After: Search index utilization
export const search = query({
  args: { searchQuery: v.string() },
  async handler(ctx, args) {
    if (!args.searchQuery.trim()) {
      return ctx.db
        .query("threads")
        .withIndex("by_user_and_time", (q) => q.eq("userId", uid))
        .order("desc")
        .collect();
    }
    
    // Database-level search (fast)
    return ctx.db
      .query("threads")
      .withSearchIndex("by_title", (q) => q.search("title", args.searchQuery))
      .take(20)
      .then((res) => res.filter((t) => t.userId === uid));
  },
});
```

## Data Transformation Patterns

### 1. Encryption Migration

#### Challenge: Migrating from Plain Text to Encrypted Storage

**Original State** (Legacy):
```typescript
// Old userSettings with plain text API keys
{
  userId: "user123",
  openaiKey: "sk-plain-text-key",  // Plain text
  anthropicKey: "plain-text-key"   // Plain text
}
```

**Target State** (Current):
```typescript
// New apiKeys table with individual encryption
{
  userId: "user123",
  openai: "encrypted-base64-data",    // AES-GCM encrypted
  google: "encrypted-base64-data",    // AES-GCM encrypted
  groq: "encrypted-base64-data",      // AES-GCM encrypted
  encryptedAt: 1703123456789          // Timestamp
}
```

**Migration Implementation**:
```typescript
// /convex/apiKeys.ts:21-50 - Graceful encryption handling
export const getApiKeys = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return null;

    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!apiKeys) {
      // Return empty structure for new users
      return {
        google: "",
        openrouter: "",
        openai: "",
        groq: "",
      };
    }

    // Attempt decryption with fallback to plain text
    return {
      google: await tryDecrypt(apiKeys.google || ""),      // Handles both encrypted and plain text
      openrouter: await tryDecrypt(apiKeys.openrouter || ""),
      openai: await tryDecrypt(apiKeys.openai || ""),
      groq: await tryDecrypt(apiKeys.groq || ""),
    };
  },
});
```

**Graceful Decryption Pattern**:
```typescript
// /convex/encryption.ts:140-160
export async function tryDecrypt(value: string): Promise<string> {
  if (!value || value.length === 0) {
    return '';
  }
  
  // Check if value looks like encrypted data
  if (!isValidBase64(value) || value.length < 20) {
    console.warn(`Treating as plain text: ${value.substring(0, 10)}...`);
    return value;  // Return as-is for plain text
  }
  
  try {
    const decrypted = await decrypt(value);
    return decrypted;
  } catch (error) {
    console.warn(`Failed to decrypt, returning as plain text: ${error}`);
    return value;  // Fallback to original value
  }
}
```

### 2. Message Content Migration

#### Pattern: Batch Content Transformation

**Scenario**: Migrating message format or adding metadata

```typescript
// Hypothetical migration function (not in current codebase)
export const migrateMessageMetadata = internalMutation({
  args: {},
  async handler(ctx) {
    const batchSize = 100;
    let processed = 0;
    
    while (true) {
      // Process messages in batches
      const messages = await ctx.db
        .query("messages")
        .filter((q) => q.eq(q.field("migrated"), undefined))
        .take(batchSize);
      
      if (messages.length === 0) break;
      
      await Promise.all(
        messages.map(async (msg) => {
          // Transform message content
          const updatedMetadata = {
            ...(msg.metadata || {}),
            version: "2.0",
            processedAt: Date.now(),
          };
          
          await ctx.db.patch(msg._id, {
            metadata: updatedMetadata,
            migrated: true,
          });
        })
      );
      
      processed += messages.length;
      console.log(`Migrated ${processed} messages`);
    }
  },
});
```

### 3. Table Restructuring

#### Pattern: Data Migration Between Tables

**Example**: Moving from legacy settings to dedicated tables

```typescript
// Migration from userSettings.encryptedApiKeys to dedicated apiKeys table
export const migrateApiKeysToTable = internalMutation({
  async handler(ctx) {
    const settingsWithApiKeys = await ctx.db
      .query("userSettings")
      .filter((q) => q.neq(q.field("encryptedApiKeys"), ""))
      .collect();
    
    for (const settings of settingsWithApiKeys) {
      // Check if migration already completed
      const existingApiKeys = await ctx.db
        .query("apiKeys")
        .withIndex("by_user", (q) => q.eq("userId", settings.userId))
        .first();
      
      if (existingApiKeys) continue; // Already migrated
      
      try {
        // Decrypt legacy data
        const decryptedKeys = JSON.parse(await tryDecrypt(settings.encryptedApiKeys));
        
        // Migrate to new table structure
        await ctx.db.insert("apiKeys", {
          userId: settings.userId,
          google: decryptedKeys.google ? await encrypt(decryptedKeys.google) : "",
          openrouter: decryptedKeys.openrouter ? await encrypt(decryptedKeys.openrouter) : "",
          openai: decryptedKeys.openai ? await encrypt(decryptedKeys.openai) : "",
          groq: decryptedKeys.groq ? await encrypt(decryptedKeys.groq) : "",
          encryptedAt: Date.now(),
        });
        
        // Clear legacy field
        await ctx.db.patch(settings._id, {
          encryptedApiKeys: "",
        });
        
        console.log(`Migrated API keys for user ${settings.userId}`);
      } catch (error) {
        console.error(`Failed to migrate API keys for user ${settings.userId}:`, error);
      }
    }
  },
});
```

## Deployment Procedures

### 1. Safe Deployment Strategy

#### Phase 1: Schema Preparation
```bash
# 1. Review schema changes
git diff HEAD~1 convex/schema.ts

# 2. Validate TypeScript compilation
npm run type-check

# 3. Test queries locally
npx convex dev
```

#### Phase 2: Backward Compatible Deployment
```typescript
// Deploy new fields as optional first
userSettings: defineTable({
  // Existing fields...
  newField: v.optional(v.string()),  // Optional for compatibility
}).index("by_user", ["userId"])
```

#### Phase 3: Progressive Rollout
```typescript
// Feature flag controlled rollout
export const useNewFeature = query({
  async handler(ctx) {
    const settings = await getUserSettings(ctx);
    
    // Feature flag check
    if (!settings?.newFeatureEnabled) {
      return legacyBehavior();
    }
    
    return newBehavior();
  },
});
```

### 2. Database Migration Checklist

#### Pre-Deployment
- [ ] Schema changes reviewed and approved
- [ ] TypeScript compilation successful
- [ ] Migration scripts tested locally
- [ ] Rollback plan documented
- [ ] Performance impact assessed

#### Deployment
- [ ] Deploy schema changes first
- [ ] Monitor Convex dashboard for errors
- [ ] Run data migration scripts if needed
- [ ] Verify new functionality
- [ ] Monitor application performance

#### Post-Deployment
- [ ] Validate data integrity
- [ ] Monitor error rates
- [ ] Update documentation
- [ ] Clean up deprecated code (future release)

### 3. Rollback Procedures

#### Schema Rollback
```bash
# Revert to previous schema version
git revert <commit-hash>
npx convex dev --sync-only
```

#### Data Rollback Strategy
```typescript
// Implement rollback functions for complex migrations
export const rollbackApiKeyMigration = internalMutation({
  async handler(ctx) {
    const migratedUsers = await ctx.db
      .query("apiKeys")
      .collect();
    
    for (const apiKeys of migratedUsers) {
      // Restore to legacy format
      const legacyData = {
        google: await tryDecrypt(apiKeys.google),
        openrouter: await tryDecrypt(apiKeys.openrouter),
        openai: await tryDecrypt(apiKeys.openai),
        groq: await tryDecrypt(apiKeys.groq),
      };
      
      // Update userSettings with legacy format
      const settings = await ctx.db
        .query("userSettings")
        .withIndex("by_user", (q) => q.eq("userId", apiKeys.userId))
        .unique();
      
      if (settings) {
        await ctx.db.patch(settings._id, {
          encryptedApiKeys: await encrypt(JSON.stringify(legacyData)),
        });
      }
      
      // Remove new table entry
      await ctx.db.delete(apiKeys._id);
    }
  },
});
```

## Performance Considerations During Migrations

### 1. Batch Processing

#### Large Dataset Migrations
```typescript
// Process data in batches to avoid timeouts
export const batchMigration = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  async handler(ctx, { batchSize = 100 }) {
    let totalProcessed = 0;
    let hasMore = true;
    
    while (hasMore) {
      const batch = await ctx.db
        .query("targetTable")
        .filter((q) => q.eq(q.field("migrated"), undefined))
        .take(batchSize);
      
      if (batch.length === 0) {
        hasMore = false;
        break;
      }
      
      // Process batch with error handling
      const results = await Promise.allSettled(
        batch.map(record => processSingleRecord(ctx, record))
      );
      
      // Log failed records
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Failed to migrate record ${batch[index]._id}:`, result.reason);
        }
      });
      
      totalProcessed += batch.length;
      console.log(`Processed ${totalProcessed} records`);
      
      // Optional: Add delay to reduce load
      if (totalProcessed % 1000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return { totalProcessed };
  },
});
```

### 2. Index Management

#### Index Creation Strategy
```typescript
// Create indexes during low-traffic periods
// Convex handles index building automatically, but monitor performance

// Before adding complex indexes, analyze query patterns
export const analyzeQueryPatterns = internalQuery({
  async handler(ctx) {
    const queryStats = {
      threadsByUser: await ctx.db.query("threads").collect().then(r => r.length),
      messagesByThread: await ctx.db.query("messages").collect().then(r => r.length),
      // ... other statistics
    };
    
    return queryStats;
  },
});
```

### 3. Memory and Resource Management

#### Efficient Migration Patterns
```typescript
// Stream processing for large datasets
export const streamMigration = internalMutation({
  async handler(ctx) {
    // Use cursor-based pagination for memory efficiency
    let cursor: string | undefined;
    let processed = 0;
    
    do {
      const result = await ctx.db
        .query("largeTable")
        .paginate({
          cursor,
          numItems: 50, // Smaller batches for memory efficiency
        });
      
      // Process current page
      await Promise.all(
        result.page.map(record => processRecord(ctx, record))
      );
      
      processed += result.page.length;
      cursor = result.hasMore ? result.nextCursor : undefined;
      
      console.log(`Processed ${processed} records`);
    } while (cursor);
    
    return processed;
  },
});
```

## Testing Migration Scripts

### 1. Local Testing Environment

#### Test Data Setup
```typescript
// Create test data for migration validation
export const createTestData = internalMutation({
  async handler(ctx) {
    // Create test users
    const testUser = await ctx.db.insert("users", {
      name: "Test User",
      email: "test@example.com",
      tokenIdentifier: "test-token-123",
    });
    
    // Create legacy data format
    await ctx.db.insert("userSettings", {
      userId: testUser,
      encryptedApiKeys: await encrypt(JSON.stringify({
        openai: "test-openai-key",
        google: "test-google-key",
      })),
    });
    
    return testUser;
  },
});
```

#### Migration Validation
```typescript
// Validate migration results
export const validateMigration = internalQuery({
  async handler(ctx) {
    const users = await ctx.db.query("users").collect();
    const validationResults = [];
    
    for (const user of users) {
      // Check old format
      const oldSettings = await ctx.db
        .query("userSettings")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();
      
      // Check new format
      const newApiKeys = await ctx.db
        .query("apiKeys")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      
      validationResults.push({
        userId: user._id,
        hasOldFormat: !!oldSettings?.encryptedApiKeys,
        hasNewFormat: !!newApiKeys,
        migrationComplete: !!newApiKeys && !oldSettings?.encryptedApiKeys,
      });
    }
    
    return validationResults;
  },
});
```

### 2. Production Validation

#### Data Integrity Checks
```typescript
// Comprehensive data validation
export const validateDataIntegrity = internalQuery({
  async handler(ctx) {
    const checks = {
      userCount: await ctx.db.query("users").collect().then(r => r.length),
      threadsWithValidUsers: 0,
      messagesWithValidThreads: 0,
      attachmentsWithValidMessages: 0,
      orphanedRecords: [],
    };
    
    // Validate user-thread relationships
    const threads = await ctx.db.query("threads").collect();
    for (const thread of threads) {
      const user = await ctx.db.get(thread.userId);
      if (user) {
        checks.threadsWithValidUsers++;
      } else {
        checks.orphanedRecords.push({
          type: "thread",
          id: thread._id,
          issue: "missing_user",
        });
      }
    }
    
    // Additional validation checks...
    
    return checks;
  },
});
```

## Monitoring and Observability

### 1. Migration Monitoring

#### Progress Tracking
```typescript
// Track migration progress
export const getMigrationStatus = internalQuery({
  async handler(ctx) {
    const totalRecords = await ctx.db.query("targetTable").collect().then(r => r.length);
    const migratedRecords = await ctx.db
      .query("targetTable")
      .filter((q) => q.eq(q.field("migrated"), true))
      .collect()
      .then(r => r.length);
    
    return {
      total: totalRecords,
      migrated: migratedRecords,
      remaining: totalRecords - migratedRecords,
      progress: (migratedRecords / totalRecords) * 100,
    };
  },
});
```

### 2. Error Handling and Logging

#### Comprehensive Error Tracking
```typescript
// Migration with detailed error logging
export const robustMigration = internalMutation({
  async handler(ctx) {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ recordId: string; error: string }>,
    };
    
    const records = await ctx.db.query("targetTable").collect();
    
    for (const record of records) {
      try {
        await migrateRecord(ctx, record);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          recordId: record._id,
          error: error instanceof Error ? error.message : String(error),
        });
        
        console.error(`Migration failed for record ${record._id}:`, error);
      }
    }
    
    return results;
  },
});
```

## Best Practices Summary

### Schema Evolution
1. **Always Add Optional Fields**: Maintain backward compatibility
2. **Deprecate Gradually**: Comment → Stop Writing → Remove Usage → Remove Field
3. **Index Carefully**: Monitor performance impact of new indexes
4. **Version Documentation**: Track changes in comments and git history

### Data Migration
1. **Batch Processing**: Handle large datasets in manageable chunks
2. **Error Resilience**: Continue processing despite individual failures
3. **Validation**: Verify data integrity before and after migration
4. **Rollback Plans**: Always have a way to undo changes

### Deployment Safety
1. **Test Locally**: Validate all changes in development
2. **Progressive Rollout**: Use feature flags for gradual deployment
3. **Monitor Actively**: Watch for errors and performance issues
4. **Document Changes**: Update documentation immediately

### Performance Optimization
1. **Memory Management**: Use streaming for large operations
2. **Resource Limits**: Respect Convex function timeout limits
3. **Parallel Processing**: Use Promise.all for independent operations
4. **Index Utilization**: Design migrations to use existing indexes

This comprehensive migration documentation provides practical strategies, real code examples, and operational procedures for safely evolving the Pak.Chat database schema and migrating data in production environments.