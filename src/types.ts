export interface Material {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: string;
}

export interface Video {
  id: string;
  title: string;
  category: 'Salgadas' | 'Doces' | 'Sem Glúten';
  thumbnail: string;
  youtubeId: string;
}

export interface Bonus {
  id: string;
  title: string;
  description: string;
  icon: string;
  url?: string;
}

export type TabType = 'home' | 'materiais' | 'aulas' | 'bonus' | 'especial';

export interface Offer {
  id: string;
  title: string;
  description: string;
  oldPrice: string;
  newPrice: string;
  image: string;
  url: string;
}
