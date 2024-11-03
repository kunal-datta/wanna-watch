import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Image } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, updateDoc, onSnapshot, getDoc, setDoc, arrayUnion } from 'firebase/firestore';

// Initialize Firebase (do this at the top level of your app)
const firebaseConfig = {
    apiKey: "AIzaSyBRlM880MkHeieMRiRlCWJedufAQTVkp1A",
    authDomain: "what-should-we-watch-de872.firebaseapp.com",
    projectId: "what-should-we-watch-de872",
    storageBucket: "what-should-we-watch-de872.firebasestorage.app",
    messagingSenderId: "108831813890",
    appId: "1:108831813890:web:352c4c88ed3f3e8121521b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Add these constants at the top of your file
const TMDB_API_KEY = 'da0ecdd247617155169cc70ef1d05bda';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const REGION = 'US'; // Change this for different countries

// Add this interface for TypeScript
interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  release_date: string;
  vote_average: number;
  providers?: {
    flatrate?: Array<{ provider_name: string; logo_path: string }>;
    rent?: Array<{ provider_name: string; logo_path: string }>;
    buy?: Array<{ provider_name: string; logo_path: string }>;
  };
}

// Add this function to fetch providers
const fetchProviders = async (movieId: number) => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`
    );
    const data = await response.json();
    return data.results[REGION] || null;
  } catch (error) {
    console.error('Error fetching providers:', error);
    return null;
  }
};

// Move this BEFORE your App function
const ProvidersSection = ({ providers, type }: { 
  providers: any, 
  type: 'flatrate' | 'rent' | 'buy' 
}) => {
  if (!providers?.[type]?.length) return null;
  
  return (
    <View style={styles.providersSection}>
      <Text style={styles.providerTitle}>
        {type === 'flatrate' ? 'Stream on:' : 
         type === 'rent' ? 'Rent on:' : 'Buy on:'}
      </Text>
      <View style={styles.providersList}>
        {providers[type].map((provider: any) => (
          <View key={provider.provider_name} style={styles.providerItem}>
            <Image
              source={{ uri: `${TMDB_IMAGE_BASE_URL}${provider.logo_path}` }}
              style={styles.providerLogo}
            />
            <Text style={styles.providerName}>{provider.provider_name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Update the state interface (add this before App function)
interface AppState {
  sessionId: string | null;
  userId: string | null;
  currentMovie: Movie | null;
  likedMoviesCount: number;
  ourList: Movie[];
  movieQueue: Movie[];
  page: number;
}

function App() {
  const [state, setState] = useState<AppState>({
    sessionId: null,
    userId: null,
    currentMovie: null,
    likedMoviesCount: 0,
    ourList: [],
    movieQueue: [],
    page: 1,
  });

  // Add this useEffect to listen for matches
  useEffect(() => {
    if (!state.sessionId) return;

    const sessionRef = doc(db, 'sessions', state.sessionId);
    const unsubscribe = onSnapshot(sessionRef, (doc) => {
      if (doc.exists()) {
        const sessionData = doc.data();
        if (sessionData.ourList) {
          setState(prev => ({
            ...prev,
            ourList: sessionData.ourList
          }));
        }
      }
    });

    return () => unsubscribe();
  }, [state.sessionId]);

  const createSession = async () => {
    try {
      const sessionsRef = collection(db, 'sessions');
      const docRef = await addDoc(sessionsRef, {
        createdAt: new Date(),
        users: [state.userId],
        likes: {},
        ourList: []
      });
      
      console.log("Session created with ID: ", docRef.id);
      return docRef;
    } catch (error) {
      console.error("Error creating session: ", error);
      throw error;
    }
  };

  const joinSession = async (code: string) => {
    try {
      const sessionRef = doc(db, 'sessions', code);
      
      // First check if session exists
      const sessionDoc = await getDoc(sessionRef);
      if (!sessionDoc.exists()) {
        throw new Error('Session not found');
      }

      // Update the session with the new user
      await updateDoc(sessionRef, {
        users: arrayUnion(state.userId)
      });

      setState(prev => ({
        ...prev,
        sessionId: code
      }));
    } catch (error) {
      console.error('Error joining session:', error);
      alert('Failed to join session. Please check the code and try again.');
    }
  };

  useEffect(() => {
    // Generate a random user ID on mount
    setState(prev => ({
      ...prev,
      userId: Math.random().toString(36).substring(7)
    }));
  }, []);

  const handleCreateSession = async () => {
    try {
      const session = await createSession();
      console.log('Created session:', session.id);
      
      setState(prev => ({
        ...prev,
        sessionId: session.id
      }));
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  // Add this function to fetch a batch of movies
  const fetchMovieBatch = async () => {
    try {
      console.log('Fetching movie batch...'); // Debug log
      const response = await fetch(
        `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${state.page}`
      );
      const data = await response.json();
      console.log('Received movies:', data.results.length); // Debug log
      
      setState(prev => ({
        ...prev,
        movieQueue: [...prev.movieQueue, ...data.results],
        page: prev.page + 1
      }));
      
      return data.results;
    } catch (error) {
      console.error('Error fetching movies:', error);
      return [];
    }
  };

  // Update your fetchNextMovie function
  const fetchNextMovie = async () => {
    try {
      console.log('Fetching next movie...'); // Debug log
      console.log('Current queue length:', state.movieQueue.length); // Debug log
      
      // If queue is running low, fetch more movies
      if (state.movieQueue.length < 5) {
        console.log('Queue is low, fetching batch...'); // Debug log
        await fetchMovieBatch();
      }
      
      // Get next movie from queue
      const nextMovie = state.movieQueue[0];
      const remainingQueue = state.movieQueue.slice(1);
      
      console.log('Next movie:', nextMovie); // Debug log
      
      if (nextMovie) {
        // Fetch providers for the movie
        const providers = await fetchProviders(nextMovie.id);
        const movieWithProviders = {
          ...nextMovie,
          providers
        };
        
        setState(prev => ({
          ...prev,
          currentMovie: movieWithProviders,
          movieQueue: remainingQueue
        }));
        console.log('State updated with new movie'); // Debug log
      }
    } catch (error) {
      console.error('Error getting next movie:', error);
    }
  };

  // Update handleLike function
  const handleLike = async () => {
    if (!state.currentMovie || !state.sessionId) return;
    
    try {
      const sessionRef = doc(db, 'sessions', state.sessionId);
      const movieId = state.currentMovie.id;
      
      // Add the like to user's likes in Firebase
      await updateDoc(sessionRef, {
        [`likes.${state.userId}.${movieId}`]: true
      });

      // Check if both users liked this movie
      const sessionDoc = await getDoc(sessionRef);
      const sessionData = sessionDoc.data();
      const otherUserLikes = Object.entries(sessionData?.likes || {})
        .find(([uid]) => uid !== state.userId)?.[1] || {};

      if (otherUserLikes[movieId]) {
        // It's a match! Add to ourList
        const updatedOurList = [...(sessionData.ourList || []), state.currentMovie];
        await updateDoc(sessionRef, {
          ourList: updatedOurList
        });
      }

      setState(prev => ({
        ...prev,
        likedMoviesCount: prev.likedMoviesCount + 1
      }));
      
      await fetchNextMovie();
    } catch (error) {
      console.error('Error liking movie:', error);
    }
  };

  const handleDislike = async () => {
    if (!state.currentMovie) return;
    await fetchNextMovie();
  };

  console.log('Current state:', state);

  return (
    <View style={styles.container}>
      {!state.sessionId ? (
        <View style={styles.welcomeContainer}>
          <Text style={styles.title}>What Should We Watch?</Text>
          <Button 
            title="Create Session" 
            onPress={handleCreateSession}
          />
          <Button 
            title="Join Session" 
            onPress={() => {
              const code = prompt('Enter session code:');
              if (code) joinSession(code);
            }}
          />
        </View>
      ) : !state.currentMovie ? (
        // Session created, waiting for movie
        <View style={styles.mainContainer}>
          <Text style={styles.sessionInfo}>Session: {state.sessionId}</Text>
          <Text style={styles.sessionInfo}>User ID: {state.userId}</Text>
          <Button 
            title="Copy Session ID" 
            onPress={() => {
              navigator.clipboard.writeText(state.sessionId);
              alert('Session ID copied to clipboard!');
            }}
          />
          <Button 
            title="Start Matching" 
            onPress={fetchNextMovie}
          />
        </View>
      ) : (
        // Movie matching interface
        <View style={styles.matchingContainer}>
          <Text style={styles.stats}>
            Liked: {state.likedMoviesCount} | Our List: {state.ourList.length}
          </Text>
          
          {/* Add Our List Modal/Section */}
          {state.ourList.length > 0 && (
            <View style={styles.ourListContainer}>
              <Text style={styles.ourListTitle}>Our List</Text>
              {state.ourList.map((movie) => (
                <View key={movie.id} style={styles.ourListItem}>
                  <Image
                    source={{ uri: `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` }}
                    style={styles.ourListPoster}
                  />
                  <Text style={styles.ourListMovieTitle}>{movie.title}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.movieCard}>
            <Text style={styles.movieTitle}>{state.currentMovie.title}</Text>
            
            {state.currentMovie.poster_path && (
              <Image
                source={{ uri: `${TMDB_IMAGE_BASE_URL}${state.currentMovie.poster_path}` }}
                style={styles.moviePoster}
              />
            )}
            
            <Text style={styles.movieYear}>
              {new Date(state.currentMovie.release_date).getFullYear()}
            </Text>
            
            <Text style={styles.movieRating}>
              Rating: {state.currentMovie.vote_average}/10
            </Text>
            
            <Text style={styles.movieDescription}>
              {state.currentMovie.overview}
            </Text>
            
            <View style={styles.providersContainer}>
              {state.currentMovie.providers && (
                <>
                  <ProvidersSection 
                    providers={state.currentMovie.providers} 
                    type="flatrate" 
                  />
                  <ProvidersSection 
                    providers={state.currentMovie.providers} 
                    type="rent" 
                  />
                  <ProvidersSection 
                    providers={state.currentMovie.providers} 
                    type="buy" 
                  />
                </>
              )}
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button title="👎 Nope" onPress={handleDislike} />
            <Button title="👍 Like" onPress={handleLike} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  welcomeContainer: {
    alignItems: 'center',
    gap: 20,
  },
  mainContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  sessionInfo: {
    fontSize: 16,
    marginBottom: 10,
  },
  matchingContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    padding: 20,
  },
  stats: {
    fontSize: 16,
    marginBottom: 20,
  },
  movieCard: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  movieTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  movieDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 300,
    marginTop: 20,
  },
  moviePoster: {
    width: '100%',
    height: 500,
    resizeMode: 'cover',
    borderRadius: 10,
    marginBottom: 10,
  },
  movieYear: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  movieRating: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  providersContainer: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  providersSection: {
    marginBottom: 15,
  },
  providerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  providersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  providerItem: {
    alignItems: 'center',
    width: 70,
  },
  providerLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginBottom: 4,
  },
  providerName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
  },
  ourListContainer: {
    marginTop: 20,
    width: '100%',
    maxWidth: 400,
  },
  ourListTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  ourListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  ourListPoster: {
    width: 50,
    height: 75,
    borderRadius: 4,
    marginRight: 10,
  },
  ourListMovieTitle: {
    fontSize: 16,
    flex: 1,
  },
});

export default App;