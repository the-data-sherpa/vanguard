/**
 * Sync PocketBase schema from pb_schema.json
 *
 * This script reads the schema definition and applies it to PocketBase,
 * creating or updating collections as needed.
 *
 * Usage: npx tsx scripts/sync-schema.ts
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://localhost:8090');

// Map our simplified schema format to PocketBase v0.23+ field format
function convertField(field: any, collections: any[]): any {
  // Base properties for all field types (PocketBase v0.23+ format)
  const base: any = {
    name: field.name,
    type: field.type,
    required: field.required || false,
    hidden: false,
    presentable: false,
    system: false,
  };

  switch (field.type) {
    case 'text':
    case 'editor':
      base.autogeneratePattern = '';
      base.min = 0;
      base.max = 0;
      base.pattern = '';
      base.primaryKey = false;
      break;

    case 'url':
      base.exceptDomains = null;
      base.onlyDomains = null;
      break;

    case 'number':
      base.min = null;
      base.max = null;
      base.onlyInt = false;
      break;

    case 'bool':
      // No additional properties needed
      break;

    case 'select':
      base.maxSelect = 1;
      base.values = field.options?.values || [];
      break;

    case 'relation':
      // Find the collection ID by name
      const targetCollection = collections.find((c: any) => c.id === field.collectionId || c.name === field.collectionId);
      base.collectionId = targetCollection?.id || field.collectionId;
      base.cascadeDelete = false;
      base.maxSelect = 1;
      base.minSelect = 0;
      break;

    case 'json':
      base.maxSize = 2000000;
      break;

    case 'file':
      base.maxSelect = 1;
      base.maxSize = 5242880;
      base.mimeTypes = [];
      base.thumbs = [];
      base.protected = false;
      break;

    case 'date':
    case 'datetime':
      base.type = 'date';
      base.min = '';
      base.max = '';
      break;
  }

  return base;
}

function convertIndexes(indexes: any[]): string[] {
  if (!indexes) return [];

  return indexes.map((idx, i) => {
    const fields = idx.fields.join(', ');
    const unique = idx.unique ? 'UNIQUE ' : '';
    const name = `idx_${i}_${idx.fields.join('_')}`;
    return `CREATE ${unique}INDEX IF NOT EXISTS ${name} ON collection (${fields})`;
  });
}

async function main() {
  const email = process.env.POCKETBASE_ADMIN_EMAIL;
  const password = process.env.POCKETBASE_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Missing POCKETBASE_ADMIN_EMAIL or POCKETBASE_ADMIN_PASSWORD in .env');
    process.exit(1);
  }

  // Read schema file
  const schemaPath = join(process.cwd(), 'pb_schema.json');
  console.log(`Reading schema from ${schemaPath}...`);

  let schema: any;
  try {
    schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  } catch (err) {
    console.error('Failed to read pb_schema.json:', err);
    process.exit(1);
  }

  // Authenticate as admin
  console.log('Authenticating as admin...');
  await pb.admins.authWithPassword(email, password);
  console.log('Authenticated.\n');

  // Get existing collections
  const existingCollections = await pb.collections.getFullList();
  const existingByName = new Map(existingCollections.map((c) => [c.name.toLowerCase().replace(/\s+/g, '_'), c]));

  // Process each collection in schema
  for (const collectionDef of schema.collections) {
    const normalizedName = collectionDef.name.toLowerCase().replace(/\s+/g, '_');
    const existing = existingByName.get(normalizedName) || existingByName.get(collectionDef.id);

    console.log(`Processing: ${collectionDef.name || collectionDef.id}`);

    // Convert schema fields
    const convertedSchema = collectionDef.schema.map((f: any) => convertField(f, schema.collections));

    if (existing) {
      // Update existing collection
      console.log(`  Updating existing collection (id: ${existing.id})...`);

      try {
        // PocketBase v0.23+ uses 'fields' instead of 'schema'
        const existingFields = (existing as any).fields || existing.schema || [];

        // Merge new fields with existing, preserving field IDs
        // First, update existing fields
        const mergedFields = convertedSchema.map((newField: any) => {
          const existingField = Array.isArray(existingFields)
            ? existingFields.find((f: any) => f.name === newField.name)
            : null;
          if (existingField) {
            return { ...existingField, ...newField, id: existingField.id };
          }
          return newField;
        });

        // Add any existing fields that aren't in the new schema (preserve them)
        for (const existingField of existingFields) {
          if (!mergedFields.some((f: any) => f.name === existingField.name)) {
            mergedFields.push(existingField);
          }
        }

        await pb.collections.update(existing.id, {
          fields: mergedFields,
        });
        console.log(`  Updated (${mergedFields.length} fields).`);
      } catch (err: any) {
        // Log the full error for debugging
        if (err.response?.data) {
          console.log(`  Warning: ${JSON.stringify(err.response.data)}`);
        } else {
          console.log(`  Warning: ${err.message}`);
        }
      }
    } else {
      // Create new collection
      console.log(`  Creating new collection...`);

      try {
        await pb.collections.create({
          id: collectionDef.id,
          name: collectionDef.name || collectionDef.id,
          type: collectionDef.type || 'base',
          schema: convertedSchema,
        });
        console.log(`  Created.`);
      } catch (err: any) {
        // Log the full error for debugging
        if (err.response?.data) {
          console.log(`  Warning: ${JSON.stringify(err.response.data)}`);
        } else {
          console.log(`  Warning: ${err.message}`);
        }
      }
    }
  }

  console.log('\nSchema sync complete!');
  console.log('Note: Some complex changes may require manual intervention in the PocketBase Admin UI.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
