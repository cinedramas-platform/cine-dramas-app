import Constants from 'expo-constants';
import { supabase } from './supabase';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl ?? '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey ?? '';

async function getHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return headers;
}

export async function invokeFunction<T>(
  functionName: string,
  params?: Record<string, string | undefined>,
): Promise<T> {
  const headers = await getHeaders();
  const url = new URL(`${supabaseUrl}/functions/v1/${functionName}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value != null) {
        url.searchParams.set(key, value);
      }
    }
  }

  let response = await fetch(url.toString(), { headers });

  if (response.status === 401) {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError) {
      const retryHeaders = await getHeaders();
      response = await fetch(url.toString(), { headers: retryHeaders });
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
