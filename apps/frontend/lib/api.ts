const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class MA1Api {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private async request(path: string, options?: RequestInit) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Erreur serveur' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // Auth
  async register(email: string, password: string, name: string, birthYear?: number) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, birth_year: birthYear }),
    });
  }

  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async me(token: string) {
    return this.request(`/auth/me?token=${token}`);
  }

  // Chat
  async chat(message: string, userId: string, history: Array<{ role: string; content: string }>) {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, user_id: userId, history }),
    });
  }

  chatStream(message: string, userId: string, history: Array<{ role: string; content: string }>) {
    return fetch(`${this.baseUrl}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, user_id: userId, history }),
    });
  }

  async clearChat(userId: string) {
    return this.request('/chat/clear', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  // QCM
  async generateQCM(topic: string, n: number, userId: string, difficulty: string) {
    return this.request('/qcm/generate', {
      method: 'POST',
      body: JSON.stringify({ topic, n, user_id: userId, difficulty }),
    });
  }

  async submitQCMResult(userId: string, topic: string, correct: boolean) {
    return this.request('/qcm/result', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, topic, correct }),
    });
  }

  // Vision
  async analyzeImage(file: File, userId: string) {
    const form = new FormData();
    form.append('file', file);
    form.append('user_id', userId);
    const res = await fetch(`${this.baseUrl}/vision`, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Erreur analyse');
    return res.json();
  }

  // Exam
  async submitExamResult(userId: string, correct: number, total: number, timeSeconds: number) {
    return this.request('/exam/result', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, correct, total, time_seconds: timeSeconds }),
    });
  }

  // Plan 30 days
  async getPlan30() { return this.request('/plan/30days'); }
  async updatePlanProgress(userId: string, day: number) {
    return this.request(`/plan/progress?user_id=${userId}&day=${day}`, { method: 'POST' });
  }

  // Readiness
  async getReadiness(userId: string) { return this.request(`/readiness/${userId}`); }

  // Veille
  async getVeille() { return this.request('/veille'); }

  // Leaderboard
  async getLeaderboard(limit = 20) { return this.request(`/leaderboard?limit=${limit}`); }

  // Referral
  async getReferral(userId: string) { return this.request(`/referral/${userId}`); }
  async applyReferral(userId: string, code: string) {
    return this.request(`/referral/apply?user_id=${userId}&code=${code}`, { method: 'POST' });
  }

  // Dashboard
  async getDashboard(ownerId: string) { return this.request(`/dashboard/${ownerId}`); }
  async addStudent(ownerId: string, email: string) {
    return this.request('/dashboard/add-student', {
      method: 'POST',
      body: JSON.stringify({ owner_id: ownerId, student_email: email }),
    });
  }

  // Stripe
  async createCheckout(userId: string, plan: string) {
    return this.request(`/stripe/checkout?user_id=${userId}&plan=${plan}`, { method: 'POST' });
  }

  // RGPD
  async exportData(userId: string) {
    const res = await fetch(`${this.baseUrl}/rgpd/export/${userId}`);
    return res.blob();
  }
  async deleteAccount(userId: string) {
    return this.request(`/rgpd/delete/${userId}`, { method: 'DELETE' });
  }
  async exportPDF(userId: string) {
    const res = await fetch(`${this.baseUrl}/export/pdf/${userId}`);
    return res.blob();
  }

  // Analytics
  async track(userId: string, event: string, data?: Record<string, any>) {
    return this.request('/analytics/event', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, event, data: data || {} }),
    }).catch(() => {}); // Silent fail
  }

  // Health
  async health() { return this.request('/health'); }
}

export const api = new MA1Api();
