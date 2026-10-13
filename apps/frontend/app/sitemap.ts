import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://ma1.app';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/landing`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/moniteur`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/apprenti`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/auto-ecole`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/abonnement`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/utilisation`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/a-propos`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/mentions-legales`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/qcm`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/exam`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/blog/vitesse-autoroute`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/blog/alcool-permis-probatoire`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/blog/priorite-a-droite`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];
}
