/**
 * PulsePoint Integration Test Script
 * Tests the PulsePoint API fetch and decryption
 *
 * Usage: npx tsx scripts/test-pulsepoint.ts [agencyId]
 * Example: npx tsx scripts/test-pulsepoint.ts EMS1681
 */

import 'dotenv/config';
import crypto from 'crypto';

const PULSEPOINT_API_BASE = 'https://api.pulsepoint.org/v1';
const DEFAULT_AGENCY_ID = 'EMS1681'; // Sacramento Metro Fire

interface PulsePointEncryptedData {
  ct: string;
  iv: string;
  s: string;
}

interface PulsePointUnit {
  UnitID: string;
  PulsePointDispatchStatus: string;
  TimeDispatched?: string;
  TimeEnroute?: string;
  TimeOnScene?: string;
}

interface PulsePointIncident {
  ID: string;
  AgencyID: string;
  PulsePointIncidentCallType: string;
  FullDisplayAddress: string;
  Latitude: string;
  Longitude: string;
  CallReceivedDateTime: string;
  ClosedDateTime?: string;
  Unit?: PulsePointUnit[];
}

/**
 * EVP_BytesToKey key derivation (OpenSSL compatible)
 */
function evpBytesToKey(
  password: string,
  salt: Buffer,
  keyLen: number,
  ivLen: number
): { key: Buffer; iv: Buffer } {
  const data = Buffer.concat([Buffer.from(password, 'utf8'), salt]);
  const blocks: Buffer[] = [];
  let lastHash = Buffer.alloc(0);

  while (Buffer.concat(blocks).length < keyLen + ivLen) {
    lastHash = crypto
      .createHash('md5')
      .update(Buffer.concat([lastHash, data]))
      .digest();
    blocks.push(lastHash);
  }

  const derived = Buffer.concat(blocks);
  return {
    key: derived.subarray(0, keyLen),
    iv: derived.subarray(keyLen, keyLen + ivLen),
  };
}

/**
 * Decrypt PulsePoint response
 * Note: PulsePoint returns double-encoded JSON (JSON string inside JSON)
 */
function decrypt(encryptedData: PulsePointEncryptedData, password: string): any {
  const salt = Buffer.from(encryptedData.s, 'hex');
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const ciphertext = Buffer.from(encryptedData.ct, 'base64');

  const { key } = evpBytesToKey(password, salt, 32, 16);

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  // First parse gets us the JSON string, second parse gets the actual object
  let result = JSON.parse(decrypted.toString('utf8'));
  if (typeof result === 'string') {
    result = JSON.parse(result);
  }
  return result;
}

async function testPulsePoint(agencyId: string) {
  console.log('='.repeat(60));
  console.log('PulsePoint Integration Test');
  console.log('='.repeat(60));
  console.log();

  // Check for API key
  const apiKey = process.env.PULSEPOINT_API_KEY;
  if (!apiKey) {
    console.error('ERROR: PULSEPOINT_API_KEY environment variable is not set');
    console.log('\nTo set it, run:');
    console.log('  export PULSEPOINT_API_KEY="your-api-key"');
    console.log('\nOr add it to your .env file:');
    console.log('  PULSEPOINT_API_KEY=your-api-key');
    process.exit(1);
  }

  console.log(`Agency ID: ${agencyId}`);
  console.log(`API Key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log();

  // Fetch from PulsePoint
  const url = `${PULSEPOINT_API_BASE}/webapp?resource=incidents&agencyid=${encodeURIComponent(agencyId)}`;
  console.log(`Fetching: ${url}`);
  console.log();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Vanguard/1.0 Test Script',
      },
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    console.log();

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ERROR: API request failed');
      console.error(errorText);
      process.exit(1);
    }

    const encryptedData: PulsePointEncryptedData = await response.json();

    console.log('Encrypted Response:');
    console.log(`  ct (ciphertext): ${encryptedData.ct.substring(0, 50)}...`);
    console.log(`  iv (init vector): ${encryptedData.iv}`);
    console.log(`  s (salt): ${encryptedData.s}`);
    console.log();

    // Decrypt
    console.log('Decrypting...');
    const decrypted = decrypt(encryptedData, apiKey);
    console.log('Decryption successful!');
    console.log();

    // Parse incidents
    const activeIncidents: PulsePointIncident[] = decrypted.incidents?.active || [];
    const recentIncidents: PulsePointIncident[] = decrypted.incidents?.recent || [];

    console.log('='.repeat(60));
    console.log('Results Summary');
    console.log('='.repeat(60));
    console.log(`Active Incidents: ${activeIncidents.length}`);
    console.log(`Recent Incidents: ${recentIncidents.length}`);
    console.log();

    // Show active incidents
    if (activeIncidents.length > 0) {
      console.log('Active Incidents:');
      console.log('-'.repeat(60));
      for (const incident of activeIncidents.slice(0, 10)) {
        const units = incident.Unit?.map(u => u.UnitID).join(', ') || 'None';
        console.log(`  ID: ${incident.ID}`);
        console.log(`  Type: ${incident.PulsePointIncidentCallType}`);
        console.log(`  Address: ${incident.FullDisplayAddress}`);
        console.log(`  Location: ${incident.Latitude}, ${incident.Longitude}`);
        console.log(`  Time: ${incident.CallReceivedDateTime}`);
        console.log(`  Units: ${units}`);
        console.log();
      }
      if (activeIncidents.length > 10) {
        console.log(`  ... and ${activeIncidents.length - 10} more active incidents`);
        console.log();
      }
    } else {
      console.log('No active incidents at this time.');
      console.log();
    }

    // Show sample of recent incidents
    if (recentIncidents.length > 0) {
      console.log('Recent Incidents (last 5):');
      console.log('-'.repeat(60));
      for (const incident of recentIncidents.slice(0, 5)) {
        console.log(`  ${incident.PulsePointIncidentCallType} - ${incident.FullDisplayAddress}`);
        console.log(`    Opened: ${incident.CallReceivedDateTime}, Closed: ${incident.ClosedDateTime || 'N/A'}`);
      }
      console.log();
    }

    // Show call type breakdown
    const callTypes: Record<string, number> = {};
    for (const incident of [...activeIncidents, ...recentIncidents]) {
      const type = incident.PulsePointIncidentCallType;
      callTypes[type] = (callTypes[type] || 0) + 1;
    }

    console.log('Call Type Breakdown:');
    console.log('-'.repeat(60));
    const sortedTypes = Object.entries(callTypes).sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sortedTypes.slice(0, 10)) {
      console.log(`  ${type}: ${count}`);
    }
    console.log();

    console.log('='.repeat(60));
    console.log('Test completed successfully!');
    console.log('='.repeat(60));

    // Output raw JSON for debugging if verbose
    if (process.argv.includes('--verbose') || process.argv.includes('-v')) {
      console.log('\nRaw Decrypted Data:');
      console.log(JSON.stringify(decrypted, null, 2));
    }

  } catch (error) {
    console.error('ERROR:', error instanceof Error ? error.message : error);

    if (error instanceof Error && error.message.includes('bad decrypt')) {
      console.log('\nDecryption failed. This usually means:');
      console.log('  1. The PULSEPOINT_API_KEY is incorrect');
      console.log('  2. The API response format has changed');
    }

    process.exit(1);
  }
}

// Get agency ID from command line or use default
const agencyId = process.argv[2] || DEFAULT_AGENCY_ID;
testPulsePoint(agencyId);
