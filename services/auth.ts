import Constants from 'expo-constants';
import { supabase } from './supabase';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl ?? '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey ?? '';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string) {
  const tenantId = Constants.expoConfig?.extra?.tenantId;
  if (!tenantId) throw new Error('Missing tenant configuration');

  const res = await fetch(`${supabaseUrl}/functions/v1/auth-register`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, tenant_id: tenantId }),
  });

  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Registration failed');

  return signIn(email, password);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
