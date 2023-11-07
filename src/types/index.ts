export type SearchResult = {
  id?: number | string;
  x: number;
  y: number;
  name: string;
  description: string;
  content?: string;
  extent?: any;
  geom?: any;
  cleanOnSelect?: boolean;
};

export type SearchResults = {
  rows: SearchResult[];
  total: number;
  loading?: boolean;
};

export type SearchOptions = {
  sort?: string;
  page?: number;
  pageSize?: number;
  [key: string]: any;
};

export type GenericObject<T> = { [key: string]: T };
