/** Road situation images from Unsplash (free to use) */
export const SITUATION_IMAGES: Record<string, string[]> = {
  vitesse: [
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&h=300&fit=crop', // highway
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=300&fit=crop', // speedometer
    'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=600&h=300&fit=crop', // road
  ],
  signalisation: [
    'https://images.unsplash.com/photo-1587573089734-599999e63e39?w=600&h=300&fit=crop', // traffic sign
    'https://images.unsplash.com/photo-1572204292164-b35ba943fca7?w=600&h=300&fit=crop', // road signs
    'https://images.unsplash.com/photo-1558618047-f4b511e4e781?w=600&h=300&fit=crop', // signals
  ],
  priorite: [
    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&h=300&fit=crop', // intersection
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=300&fit=crop', // roundabout
  ],
  alcool: [
    'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&h=300&fit=crop', // night driving
  ],
  autoroute: [
    'https://images.unsplash.com/photo-1504222490345-c075b6008014?w=600&h=300&fit=crop', // highway
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&h=300&fit=crop', // motorway
  ],
  stationnement: [
    'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600&h=300&fit=crop', // parking
  ],
  securite: [
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&h=300&fit=crop', // car safety
  ],
};

export function getTopicImage(topic: string): string | undefined {
  const images = SITUATION_IMAGES[topic];
  if (!images || images.length === 0) return undefined;
  return images[Math.floor(Math.random() * images.length)];
}
