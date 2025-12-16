export interface TunnelMessage {
  type: 'request' | 'response';
  id: string;
  data: string; // Serialized HTTP request/response
}

export interface SubdomainMessage {
  subdomain: string;
}

export interface User {
  id: number;
  email: string;
  password_hash: string;
  salt: string;
  is_subscriber: number;
}

export interface AuthCode {
  code: string;
  user_id?: number;
  expires_at: number;
  used: number;
}

export interface Session {
  token: string;
  user_id: number;
  expires_at: number;
}