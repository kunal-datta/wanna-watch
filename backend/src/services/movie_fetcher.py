import httpx
import os
from typing import List
from datetime import date
from pydantic import BaseModel

class Movie(BaseModel):
    id: int
    title: str
    overview: str
    poster_path: str | None
    release_date: date | None
    vote_average: float
    vote_count: int
    popularity: float
    adult: bool = False
    original_language: str
    original_title: str
    backdrop_path: str | None = None
    video: bool = False
    genre_ids: List[int] = []
    media_type: str = "movie"

class StreamingProvider(BaseModel):
    provider_id: int
    provider_name: str
    display_priority: int
    logo_path: str

class StreamingAvailability(BaseModel):
    movie_id: str
    providers: List[StreamingProvider]

class MovieFetcher:
    def __init__(self):
        self.api_key = os.getenv("TMDB_API_KEY")
        if not self.api_key:
            raise ValueError("TMDB_API_KEY environment variable is not set")
        
        self.base_url = "https://api.themoviedb.org/3"
        self.headers = {
            "accept": "application/json"
        }

    async def get_trending_movies(self) -> List[Movie]:
        """
        Fetches trending movies for the week from TMDB API
        Returns a list of Movie objects
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/trending/movie/week",
                params={"api_key": self.api_key},
                headers=self.headers
            )
            
            if response.status_code != 200:
                raise Exception(f"TMDB API error: {response.text}")
            
            data = response.json()
            return [Movie(**movie) for movie in data.get("results", [])]

    async def get_streaming_availability(self, movie_ids: List[str]) -> List[StreamingAvailability]:
        """
        Fetches streaming availability for a list of movies from TMDB API
        Args:
            movie_ids: List of TMDB movie IDs
        Returns:
            List of StreamingAvailability objects containing streaming providers for each movie
        """
        results = []
        async with httpx.AsyncClient() as client:
            for movie_id in movie_ids:
                response = await client.get(
                    f"{self.base_url}/movie/{movie_id}/watch/providers",
                    params={"api_key": self.api_key},
                    headers=self.headers
                )
                
                if response.status_code != 200:
                    continue  # Skip failed requests instead of failing entirely
                
                data = response.json()
                # Extract US streaming providers if available
                us_data = data.get("results", {}).get("US", {})
                providers = []
                
                # Combine flatrate (subscription) and free services
                for provider_type in ["flatrate", "free"]:
                    raw_providers = us_data.get(provider_type, [])
                    providers.extend([
                        StreamingProvider(
                            provider_id=p["provider_id"],
                            provider_name=p["provider_name"],
                            display_priority=p.get("display_priority", 0),
                            logo_path=f"https://image.tmdb.org/t/p/original{p['logo_path']}"
                        ) for p in raw_providers
                    ])
                
                # Remove duplicates based on provider_id
                unique_providers = {p.provider_id: p for p in providers}.values()
                
                results.append(StreamingAvailability(
                    movie_id=movie_id,
                    providers=sorted(unique_providers, key=lambda x: x.display_priority)
                ))
        
        return results