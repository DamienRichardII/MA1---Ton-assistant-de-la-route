import { NextRequest } from 'next/server';

const API = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname.replace('/api/', '/') + url.search;
  const res = await fetch(API + path, { headers: Object.fromEntries(req.headers) });
  return new Response(res.body, { status: res.status, headers: {'Content-Type': res.headers.get('Content-Type') || 'application/json'} });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname.replace('/api/', '/') + url.search;
  const body = await req.text();
  const res = await fetch(API + path, {
    method: 'POST', body, headers: { 'Content-Type': 'application/json' },
  });
  return new Response(res.body, { status: res.status, headers: {'Content-Type': res.headers.get('Content-Type') || 'application/json'} });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname.replace('/api/', '/') + url.search;
  const res = await fetch(API + path, { method: 'DELETE' });
  return new Response(res.body, { status: res.status, headers: {'Content-Type': 'application/json'} });
}
