export interface Flyer {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
}
