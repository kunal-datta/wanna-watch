import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Image, ActivityIndicator, Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SwipeCard } from './components/SwipeCard';
import { TMDB_BASE_URL, TMDB_API_KEY, TMDB_IMAGE_BASE_URL } from './config/env';

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  overview: string;
  vote_average: number;
}

interface LikedMovie {
  id: number;
  title: string;
  providers: any[];
}

export default function App() {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedMovies, setLikedMovies] = useState<LikedMovie[]>([]);
  const [viewedMovieIds, setViewedMovieIds] = useState<Set<number>>(new Set());

  const screenWidth = Dimensions.get('window').width;
  const leftColumnWidth = Math.floor(screenWidth * 0.7);
  const rightColumnWidth = screenWidth - leftColumnWidth;

  const styles = StyleSheet.create({
    container: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#fff',
    },
    swipeContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      borderRightWidth: 1,
      borderRightColor: '#e0e0e0',
    },
    listContainer: {
      position: 'absolute',
      top: 0,
      height: '100%',
      backgroundColor: '#f8f8f8',
      padding: 20,
    },
    listTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    list: {
      flex: 1,
      overflow: 'auto',
    },
    likedMovieItem: {
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#e0e0e0',
    },
    movieTitle: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 8,
    },
    providersRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    providerLogo: {
      width: 25,
      height: 25,
      borderRadius: 12.5,
    },
    noMoviesText: {
      fontSize: 18,
      textAlign: 'center',
      padding: 20,
    },
  });

  const fetchMovieProviders = async (movieId: number) => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`
      );
      const data = await response.json();
      
      // Get US providers including streaming, rent, and buy options
      const usData = data.results?.US || {};
      const allProviders = [
        ...(usData.flatrate || []), // Streaming
        ...(usData.free || []),     // Free
        ...(usData.ads || [])       // Ad-supported
      ];
      
      // Remove duplicates based on provider_id
      const uniqueProviders = Array.from(
        new Map(allProviders.map(item => [item.provider_id, item])).values()
      );
      
      console.log('Available providers:', uniqueProviders);
      setProviders(uniqueProviders);
    } catch (error) {
      console.error('Error fetching providers:', error);
      setProviders([]);
    }
  };

  const fetchRandomMovie = async () => {
    try {
      setLoading(true);
      let foundNewMovie = false;
      let page = 1;
      
      console.log('Currently viewed movies:', Array.from(viewedMovieIds));
      
      while (!foundNewMovie) {
        const response = await fetch(
          `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
        );
        const data = await response.json();
        
        // Filter out already viewed movies
        const unwatchedMovies = data.results.filter((m: Movie) => {
          const isViewed = viewedMovieIds.has(m.id);
          console.log(`Movie ${m.title} (${m.id}) viewed status:`, isViewed);
          return !isViewed;
        });
        
        console.log('Unwatched movies count:', unwatchedMovies.length);
        
        if (unwatchedMovies.length > 0) {
          const randomMovie = unwatchedMovies[Math.floor(Math.random() * unwatchedMovies.length)];
          console.log('Selected new movie:', randomMovie.title, randomMovie.id);
          
          // Add the movie to viewed set BEFORE setting it as current
          setViewedMovieIds(prev => new Set([...prev, randomMovie.id]));
          
          // Then set it as current and fetch providers
          setMovie(randomMovie);
          await fetchMovieProviders(randomMovie.id);
          foundNewMovie = true;
        } else {
          console.log('No unwatched movies on page', page, 'trying next page');
          page++;
          if (page > 500) {
            console.log('No more unwatched movies available');
            setLoading(false);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching movie:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLikeMovie = () => {
    if (movie) {
      console.log('Liking movie:', movie.title, movie.id);
      
      setLikedMovies(prev => [...prev, {
        id: movie.id,
        title: movie.title,
        providers: providers
      }]);
      
      // No need to add to viewedMovieIds here as it's already added when fetched
      
      fetchRandomMovie();
    }
  };

  const handleSkipMovie = () => {
    if (movie) {
      console.log('Skipping movie:', movie.title, movie.id);
      
      // No need to add to viewedMovieIds here as it's already added when fetched
      
      fetchRandomMovie();
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchRandomMovie();
  }, []);

  // Log whenever viewedMovieIds changes
  useEffect(() => {
    console.log('Updated viewed movies:', Array.from(viewedMovieIds));
  }, [viewedMovieIds]);

  console.log('Current movie:', movie);
  console.log('Current providers:', providers);

  console.log('Rendering App with movie:', movie);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={[styles.swipeContainer, { width: leftColumnWidth }]}>
          {loading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : movie ? (
            <SwipeCard
              movie={movie}
              providers={providers}
              onSwipeLeft={handleSkipMovie}
              onSwipeRight={handleLikeMovie}
              containerWidth={leftColumnWidth}
            />
          ) : (
            <Text style={styles.noMoviesText}>No more unwatched movies available</Text>
          )}
        </View>
        
        <View style={[styles.listContainer, { width: rightColumnWidth, left: leftColumnWidth }]}>
          <Text style={styles.listTitle}>Liked Movies</Text>
          <ScrollView style={styles.list}>
            {likedMovies.map((likedMovie, index) => (
              <View key={likedMovie.id || index} style={styles.likedMovieItem}>
                <Text style={styles.movieTitle}>{likedMovie.title}</Text>
                <View style={styles.providersRow}>
                  {likedMovie.providers.map((provider, providerIndex) => (
                    <Image
                      key={provider.provider_id || providerIndex}
                      source={{ uri: `${TMDB_IMAGE_BASE_URL}${provider.logo_path}` }}
                      style={styles.providerLogo}
                    />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </GestureHandlerRootView>
  );
} 