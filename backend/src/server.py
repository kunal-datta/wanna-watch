from fastapi import FastAPI, HTTPException, Query
from typing import List
from .services.movie_fetcher import Movie, MovieFetcher, StreamingAvailability

app = FastAPI()

# Initialize the MovieFetcher with API key from environment
movie_fetcher = MovieFetcher()


@app.get("/api/movies/trending")
async def get_trending_movies() -> List[Movie]:
    try:
        trending_movies = await movie_fetcher.get_trending_movies()
        return trending_movies
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/movies/streaming", response_model=List[StreamingAvailability])
async def get_movie_streaming(
    movie_ids: List[str] = Query(..., description="List of movie IDs to check")
) -> List[StreamingAvailability]:
    """
    Get streaming availability for multiple movies
    Args:
        movie_ids: List of movie IDs to check
    Returns:
        List of StreamingAvailability objects containing streaming providers for each movie
    """
    try:
        return await movie_fetcher.get_streaming_availability(movie_ids)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

