import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, StyleSheet, Platform, ScrollView } from 'react-native';
import { Movie, Provider, AppState } from './types';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getFirestore, collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  // Your Firebase config object
  apiKey: "AIzaSyBRlM880MkHeieMRiRlCWJedufAQTVkp1A",
  authDomain: "what-should-we-watch-de872.firebaseapp.com",
  projectId: "what-should-we-watch-de872",
  storageBucket: "what-should-we-watch-de872.firebasestorage.app",
  messagingSenderId: "108831813890",
  appId: "1:108831813890:web:352c4c88ed3f3e8121521b"
};

// Initialize Firebase
initializeApp(firebaseConfig);

export default function App() {
  const [state, setState] = useState<AppState>({
    sessionId: null,
    userId: null,
    currentMovie: null,
    likedMoviesCount: 0,
    ourList: [],
    movieQueue: [],
    page: 1,
    currentProviders: [],
    isOurListVisible: false,
    isMovieModalVisible: false,
  });

  const TMDB_API_KEY = 'da0ecdd247617155169cc70ef1d05bda';
  const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

  const db = getFirestore();

  const fetchNextMovie = async () => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&page=${state.page}`
      );
      const data = await response.json();
      const movie = data.results[0];

      if (movie) {
        setState(prevState => ({
          ...prevState,
          currentMovie: movie,
          page: prevState.page + 1
        }));
        await fetchProviders(movie.id);
      }
    } catch (error) {
      console.error('Error getting next movie:', error);
    }
  };

  const fetchProviders = async (movieId: number) => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`
      );
      const data = await response.json();
      
      const usProviders = data.results?.US?.flatrate || [];
      setState(prevState => ({
        ...prevState,
        currentProviders: usProviders
      }));
    } catch (error) {
      console.error('Error fetching providers:', error);
      setState(prevState => ({
        ...prevState,
        currentProviders: []
      }));
    }
  };

  const handleLike = async () => {
    setState(prevState => ({
      ...prevState,
      likedMoviesCount: prevState.likedMoviesCount + 1
    }));
    await fetchNextMovie();
  };

  const handleDislike = async () => {
    await fetchNextMovie();
  };

  const handleShare = async () => {
    if (!state.sessionId) {
      alert('No active session to share');
      return;
    }
    
    try {
      await Clipboard.setStringAsync(state.sessionId);
      alert('Session code copied to clipboard! Share this with your friend.');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Could not copy session code. Your code is: ' + state.sessionId);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNextMovie();
  }, []);

  const MovieDetailModal = ({ 
    movie, 
    providers, 
    visible, 
    onClose 
  }: { 
    movie: Movie; 
    providers: Provider[];
    visible: boolean; 
    onClose: () => void;
  }) => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll}>
            <Text style={styles.modalTitle}>{movie.title}</Text>
            
            <Image
              source={{ uri: `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` }}
              style={styles.modalPoster}
            />
            
            <View style={styles.modalInfo}>
              <View style={styles.modalRatingRow}>
                <Text style={styles.modalYear}>
                  {new Date(movie.release_date).getFullYear()}
                </Text>
                <Text style={styles.modalRating}>
                  Rating: {movie.vote_average.toFixed(1)}/10
                </Text>
              </View>

              <View style={styles.modalWatchOptions}>
                <Text style={styles.modalSectionTitle}>Watch on:</Text>
                <View style={styles.modalProviders}>
                  {providers.length > 0 ? (
                    providers.map((provider) => (
                      <View key={provider.provider_id} style={styles.modalProviderItem}>
                        <Image
                          source={{ uri: `${TMDB_IMAGE_BASE_URL}${provider.logo_path}` }}
                          style={styles.modalProviderLogo}
                        />
                        <Text style={styles.modalProviderName}>
                          {provider.provider_name}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noProvidersText}>
                      No streaming options available
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.modalOverviewSection}>
                <Text style={styles.modalSectionTitle}>Overview</Text>
                <Text style={styles.modalOverview}>{movie.overview}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const createSession = async () => {
    try {
      // Generate a random userId if not exists
      const newUserId = state.userId || Math.random().toString(36).substring(7);
      
      // Create a new session document
      const sessionsRef = collection(db, 'sessions');
      const docRef = await addDoc(sessionsRef, {
        createdAt: new Date(),
        users: [newUserId],
        likes: {},
        ourList: []
      });

      // Update state with session and user IDs
      setState(prevState => ({
        ...prevState,
        sessionId: docRef.id,
        userId: newUserId
      }));

      console.log('Session created with ID:', docRef.id); // Debug log
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session. Please try again.');
    }
  };

  const joinSession = async (code: string) => {
    try {
      // Generate a random userId if not exists
      const newUserId = state.userId || Math.random().toString(36).substring(7);
      
      const sessionRef = doc(db, 'sessions', code);
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        alert('Session not found. Please check the code and try again.');
        return;
      }

      // Add the new user to the session
      await updateDoc(sessionRef, {
        users: [...sessionDoc.data().users, newUserId]
      });

      // Update state with session and user IDs
      setState(prevState => ({
        ...prevState,
        sessionId: code,
        userId: newUserId
      }));

      console.log('Joined session:', code); // Debug log
    } catch (error) {
      console.error('Error joining session:', error);
      alert('Failed to join session. Please check the code and try again.');
    }
  };

  return (
    <View style={styles.container}>
      {!state.sessionId ? (
        <View style={styles.welcomeContainer}>
          <View style={styles.welcomeContent}>
            <Ionicons 
              name="film-outline" 
              size={80} 
              color="#007AFF" 
              style={styles.welcomeIcon}
            />
            
            <Text style={styles.title}>What Should We Watch?</Text>
            
            <Text style={styles.subtitle}>
              Find your next movie to watch together
            </Text>

            <View style={styles.welcomeButtonContainer}>
              <TouchableOpacity 
                style={styles.createButton} 
                onPress={createSession}
                activeOpacity={0.8}
              >
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="add-circle" size={24} color="#FFF" />
                </View>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonPrimaryText}>Create New Session</Text>
                  <Text style={styles.buttonSecondaryText}>Start matching movies with friends</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity 
                style={styles.joinButton} 
                onPress={() => {
                  const code = prompt('Enter session code:');
                  if (code) joinSession(code);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="enter" size={24} color="#FFF" />
                </View>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonPrimaryText}>Join Session</Text>
                  <Text style={styles.buttonSecondaryText}>Enter a friend's session code</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={styles.footer}>
            Made with ❤️ for movie lovers
          </Text>
        </View>
      ) : (
        <View style={styles.container}>
          {state.currentMovie && (
            <View style={styles.matchingContainer}>
              <View style={styles.header}>
                <TouchableOpacity 
                  onPress={handleShare}
                  style={styles.headerButton}
                >
                  <Ionicons name="person-add" size={24} color="#007AFF" />
                </TouchableOpacity>

                <View style={styles.statsContainer}>
                  <Ionicons name="heart" size={16} color="#ff4b4b" />
                  <Text style={styles.stats}>{state.likedMoviesCount} Liked</Text>
                </View>

                <TouchableOpacity 
                  onPress={() => setState(prev => ({ ...prev, isOurListVisible: true }))}
                  style={styles.headerButton}
                >
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchCount}>{state.ourList.length}</Text>
                  </View>
                  <Ionicons name="heart-circle" size={28} color="#ff4b4b" />
                </TouchableOpacity>
              </View>

              <View style={styles.cardContainer}>
                <TouchableOpacity 
                  style={styles.cardContainer}
                  onPress={() => setState(prev => ({ ...prev, isMovieModalVisible: true }))}
                  activeOpacity={0.9}
                >
                  <View style={styles.movieCard}>
                    <Text style={styles.movieTitle} numberOfLines={2}>
                      {state.currentMovie.title}
                    </Text>
                    
                    <Image
                      source={{ uri: `${TMDB_IMAGE_BASE_URL}${state.currentMovie.poster_path}` }}
                      style={styles.moviePoster}
                    />
                    
                    <View style={styles.infoContainer}>
                      <View style={styles.ratingRow}>
                        <View style={styles.ratingBadge}>
                          <Ionicons name="star" size={16} color="#FFD700" />
                          <Text style={styles.movieRating}>
                            {state.currentMovie.vote_average.toFixed(1)}
                          </Text>
                        </View>
                        
                        <View style={styles.yearBadge}>
                          <Text style={styles.movieYear}>
                            {new Date(state.currentMovie.release_date).getFullYear()}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.watchOptionsContainer}>
                        <Text style={styles.watchOptionsTitle}>Watch on:</Text>
                        <View style={styles.providersContainer}>
                          {state.currentProviders.length > 0 ? (
                            state.currentProviders.map((provider) => (
                              <View key={provider.provider_id} style={styles.providerItem}>
                                <Image
                                  source={{ uri: `${TMDB_IMAGE_BASE_URL}${provider.logo_path}` }}
                                  style={styles.providerLogo}
                                />
                                <Text style={styles.providerName} numberOfLines={1}>
                                  {provider.provider_name}
                                </Text>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.noProvidersText}>
                              Not currently streaming
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.buttonContainer}>
                <View style={styles.buttonWrapper}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.nopeButton]} 
                    onPress={handleDislike}
                  >
                    <Ionicons name="close-circle" size={32} color="#ff4b4b" />
                    <Text style={[styles.actionButtonText, styles.nopeButtonText]}>Pass</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.buttonWrapper}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.likeButton]} 
                    onPress={handleLike}
                  >
                    <Ionicons name="heart-circle" size={32} color="#4bff4b" />
                    <Text style={[styles.actionButtonText, styles.likeButtonText]}>Like</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          {state.currentMovie && (
            <MovieDetailModal
              movie={state.currentMovie}
              providers={state.currentProviders}
              visible={state.isMovieModalVisible}
              onClose={() => setState(prev => ({ ...prev, isMovieModalVisible: false }))}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  matchingContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  cardContainer: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
  },
  movieCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  moviePoster: {
    width: '100%',
    height: undefined,
    aspectRatio: 2/3,
    borderRadius: 12,
    marginBottom: 12,
  },
  infoContainer: {
    gap: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FFE5B4',
  },
  movieRating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B8860B',
  },
  yearBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  movieYear: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  watchOptionsContainer: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  watchOptionsTitle: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  providersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  providerItem: {
    alignItems: 'center',
    width: 60,
  },
  providerLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  providerName: {
    fontSize: 10,
    color: '#495057',
    textAlign: 'center',
  },
  movieDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#444',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  buttonWrapper: {
    paddingHorizontal: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nopeButton: {
    backgroundColor: '#fff0f0',
    borderWidth: 1,
    borderColor: '#ff4b4b',
  },
  likeButton: {
    backgroundColor: '#f0fff0',
    borderWidth: 1,
    borderColor: '#4bff4b',
  },
  nopeButtonText: {
    color: '#ff4b4b',
  },
  likeButtonText: {
    color: '#4bff4b',
  },
  inviteButton: {
    padding: 8,
    zIndex: 2,
  },
  ourListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  ourListCount: {
    marginLeft: 5,
    fontSize: 16,
    fontWeight: 'bold',
  },
  stats: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  matchBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff4b4b',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  matchCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    width: '100%',
  },
  modalHeader: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    padding: 5,
  },
  modalScroll: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 15,
  },
  modalPoster: {
    width: '100%',
    height: undefined,
    aspectRatio: 2/3,
    resizeMode: 'contain',
  },
  modalInfo: {
    padding: 15,
  },
  modalRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  modalYear: {
    fontSize: 16,
    color: '#666',
  },
  modalRating: {
    fontSize: 16,
    color: '#666',
  },
  modalWatchOptions: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  modalProviders: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  modalProviderItem: {
    alignItems: 'center',
    width: 80,
  },
  modalProviderLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginBottom: 5,
  },
  modalProviderName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
  },
  modalOverviewSection: {
    marginTop: 10,
  },
  modalOverview: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  noProvidersText: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: 14,
  },
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  welcomeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  welcomeIcon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 40,
    lineHeight: 22,
  },
  welcomeButtonContainer: {
    width: '100%',
    maxWidth: 340,
    gap: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5856D6',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#5856D6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonPrimaryText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonSecondaryText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  dividerText: {
    color: '#666',
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});