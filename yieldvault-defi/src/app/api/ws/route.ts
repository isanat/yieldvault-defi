import { NextRequest } from 'next/server';

/**
 * WebSocket endpoint for real-time updates
 * Note: Next.js App Router doesn't natively support WebSockets
 * For production, use a custom server with ws package
 * 
 * Channels:
 * - vault: TVL, share price, APY updates
 * - harvest: New harvest events
 * - user:{address}: User-specific updates
 */

// In-memory store for demo (use Redis in production)
const lastUpdates = new Map<string, unknown>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get('channel');

  // Return last update for polling fallback
  if (channel && lastUpdates.has(channel)) {
    return new Response(
      JSON.stringify({
        channel,
        data: lastUpdates.get(channel),
        timestamp: Date.now(),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Return WebSocket connection instructions
  return new Response(
    JSON.stringify({
      message: 'WebSocket endpoint',
      instructions: 'Connect to ws://your-server/ws for real-time updates',
      polling: 'GET /api/ws?channel=vault for last update',
      channels: ['vault', 'harvest', 'user:{address}'],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Store update for polling (called by other services)
 */
export function storeUpdate(channel: string, data: unknown) {
  lastUpdates.set(channel, {
    ...data as object,
    timestamp: Date.now(),
  });
}

/**
 * Clear old updates periodically
 */
setInterval(() => {
  // Clear updates older than 5 minutes
  const now = Date.now();
  lastUpdates.forEach((value, key) => {
    const data = value as { timestamp?: number };
    if (data.timestamp && now - data.timestamp > 5 * 60 * 1000) {
      lastUpdates.delete(key);
    }
  });
}, 60 * 1000);
