// SGTX Authentication & Session Management
// Non-custodial: all authentication is tenant-controlled

export interface Session {
  id: number;
  employeeId: number;
  token: string;
  portalContext: string;
  expiresAt: string;
  tenantId?: number;
  gtid?: string;
  role?: string;
}

export interface AuthContext {
  session: Session;
  tenantId: number;
  tenantGtid: string;
  tenantType: string;
  employeeId: number;
  employeeName: string;
  role: string;
  traderMode?: string;
}

export function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  let token = 'sgtx_';
  for (let i = 0; i < 64; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}

export function hashToken(token: string): string {
  // Simple hash for session token storage
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'sgtx_hash_' + Math.abs(hash).toString(36);
}

export function getSessionExpiry(): string {
  const date = new Date();
  date.setHours(date.getHours() + 15); // 15 hour session
  return date.toISOString();
}

// Demo session management (in production, use proper JWT with ZITADEL)
export const DEMO_USERS: Record<string, { password: string; employeeId: number; name: string }> = {
  'ahmed@nilefoods.com': { password: 'demo123', employeeId: 1, name: 'Ahmed Hassan' },
  'hans@euimport.com': { password: 'demo123', employeeId: 3, name: 'Hans Mueller' },
  'admin@sgtx.io': { password: 'demo123', employeeId: 15, name: 'SGTX Admin' },
  'khaled@pharaohagri.com': { password: 'demo123', employeeId: 4, name: 'Khaled Mahmoud' },
  'omar@dubaifresh.com': { password: 'demo123', employeeId: 5, name: 'Omar Al-Rashid' },
  'yasser@nilelogistics.com': { password: 'demo123', employeeId: 7, name: 'Yasser Ibrahim' },
  'captain@medshipping.com': { password: 'demo123', employeeId: 8, name: 'Captain Adel Soliman' },
  'dr.samir@cairolabs.com': { password: 'demo123', employeeId: 9, name: 'Dr. Samir Naguib' },
  'noha@qualitycheck.com': { password: 'demo123', employeeId: 10, name: 'Noha Fathy' },
  'mohamed@deltabrokers.com': { password: 'demo123', employeeId: 11, name: 'Mohamed Adel' },
  'fatma@nbe.com.eg': { password: 'demo123', employeeId: 12, name: 'Fatma El-Shazly' },
  'general.ibrahim@customs.gov.eg': { password: 'demo123', employeeId: 14, name: 'General Ibrahim Fawzy' },
  'dr.heba@agri.gov.eg': { password: 'demo123', employeeId: 15, name: 'Dr. Heba Salem' },
  'rashid@gulfcapital.com': { password: 'demo123', employeeId: 13, name: 'Rashid Al-Mansoori' },
};
