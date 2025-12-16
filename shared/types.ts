export interface TunnelMessage {
  type: 'request' | 'response';
  id: string;
  data: string; // Serialized HTTP request/response
}

export interface SubdomainMessage {
  subdomain: string;
}