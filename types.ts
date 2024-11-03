export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  release_date: string;
  vote_average: number;
}

export interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface AppState {
  sessionId: string | null;
  userId: string | null;
  currentMovie: Movie | null;
  likedMoviesCount: number;
  ourList: Movie[];
  movieQueue: Movie[];
  page: number;
  currentProviders: Provider[];
  isOurListVisible: boolean;
} 