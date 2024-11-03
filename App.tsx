import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, StyleSheet, Platform, ScrollView, TextInput, SafeAreaView, ActivityIndicator } from 'react-native';
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

const JoinSessionModal = ({ 
  visible, 
  onClose, 
  onJoin 
}: { 
  visible: boolean; 
  onClose: () => void; 
  onJoin: (code: string) => void;
}) => {
  const [code, setCode] = useState('');

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Join Session</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Enter session code"
            placeholderTextColor="#666"
            onChangeText={setCode}
            value={code}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={() => {
                setCode('');
                onClose();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalButton, styles.joinButton]}
              onPress={() => {
                if (code.trim()) {
                  onJoin(code.trim());
                  setCode('');
                  onClose();
                }
              }}
            >
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

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

  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false);
  const [sessionCode, setSessionCode] = useState('');

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

  const MovieDetailModal = ({ movie, providers, visible, onClose }) => {
    if (!movie) return null;
    
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={visible}
        onRequestClose={onClose}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalScroll} bounces={false}>
            {/* Hero Section */}
            <View style={styles.modalHero}>
              <Image
                source={{ uri: `${TMDB_IMAGE_BASE_URL}${movie.backdrop_path || movie.poster_path}` }}
                style={styles.modalBackdrop}
              />
              <View style={styles.darkOverlay} />
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="close-circle" size={32} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{movie.title}</Text>
            </View>

            {/* Content Section */}
            <View style={styles.modalContent}>
              {/* Quick Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="star" size={20} color="#FFD700" />
                  <Text style={styles.statText}>{movie.vote_average.toFixed(1)}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="calendar-outline" size={20} color="#666" />
                  <Text style={styles.statText}>
                    {new Date(movie.release_date).getFullYear()}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="people-outline" size={20} color="#666" />
                  <Text style={styles.statText}>{movie.vote_count} votes</Text>
                </View>
              </View>

              {/* Overview */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <Text style={styles.overview}>{movie.overview}</Text>
              </View>

              {/* Streaming Options */}
              {providers.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Available on</Text>
                  <View style={styles.providersGrid}>
                    {providers.map(provider => (
                      <View key={provider.provider_id} style={styles.modalProviderItem}>
                        <Image
                          source={{ uri: `${TMDB_IMAGE_BASE_URL}${provider.logo_path}` }}
                          style={styles.modalProviderLogo}
                        />
                        <Text style={styles.providerName} numberOfLines={1}>
                          {provider.provider_name}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      {!state.sessionId ? (
        // Welcome Screen
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
                style={[styles.createButton, { backgroundColor: '#5856D6' }]} 
                onPress={() => setIsJoinModalVisible(true)}
                activeOpacity={0.8}
              >
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="enter" size={24} color="#FFF" />
                </View>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonPrimaryText}>Join a Session</Text>
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
        // Movie Matching Screen
        <View style={styles.matchingContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={handleShare}
              style={styles.headerButton}
            >
              <Ionicons name="person-add" size={24} color="#007AFF" />
            </TouchableOpacity>

            <View style={styles.statsContainer}>
              <Text style={styles.stats}>
                Liked: {state.likedMoviesCount}
              </Text>
            </View>

            <TouchableOpacity 
              onPress={() => setState(prev => ({ ...prev, isOurListVisible: true }))}
              style={styles.headerButton}
            >
              <Ionicons name="heart" size={24} color="#ff4b4b" />
            </TouchableOpacity>
          </View>

          {/* Card */}
          {state.currentMovie ? (
            <View style={styles.cardContainer}>
              <TouchableOpacity 
                style={styles.movieCard}
                onPress={() => setState(prev => ({ ...prev, isMovieModalVisible: true }))}
                activeOpacity={0.95}
              >
                <Image
                  source={{ uri: `${TMDB_IMAGE_BASE_URL}${state.currentMovie.poster_path}` }}
                  style={styles.moviePoster}
                />
                <View style={styles.infoContainer}>
                  <Text style={styles.movieTitle} numberOfLines={2}>
                    {state.currentMovie.title}
                  </Text>
                  
                  <View style={styles.watchOptionsContainer}>
                    <Text style={styles.watchOptionsTitle}>Available on:</Text>
                    <View style={styles.providersContainer}>
                      {state.currentProviders.length > 0 ? (
                        state.currentProviders.map((provider) => (
                          <View key={provider.provider_id} style={styles.providerItem}>
                            <Image
                              source={{ uri: `${TMDB_IMAGE_BASE_URL}${provider.logo_path}` }}
                              style={styles.providerLogo}
                            />
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noProvidersText}>Not currently streaming</Text>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading movies...</Text>
            </View>
          )}

          {/* Action Buttons */}
          {state.currentMovie && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.nopeButton]} 
                onPress={handleDislike}
              >
                <Ionicons name="close-circle" size={32} color="#ff4b4b" />
                <Text style={[styles.actionButtonText, styles.nopeButtonText]}>Pass</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.likeButton]} 
                onPress={handleLike}
              >
                <Ionicons name="heart-circle" size={32} color="#4bff4b" />
                <Text style={[styles.actionButtonText, styles.likeButtonText]}>Like</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Join Session Modal */}
      <JoinSessionModal
        visible={isJoinModalVisible}
        onClose={() => setIsJoinModalVisible(false)}
        onJoin={joinSession}
      />

      <MovieDetailModal
        movie={state.currentMovie}
        providers={state.currentProviders}
        visible={state.isMovieModalVisible}
        onClose={() => setState(prev => ({ ...prev, isMovieModalVisible: false }))}
      />
    </SafeAreaView>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 2,
    height: 35,
  },
  cardContainer: {
    position: 'absolute',
    top: 45, // Just below header
    left: 0,
    right: 0,
    bottom: 80, // Space for bottom buttons
    paddingHorizontal: 15,
  },
  movieCard: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  moviePoster: {
    width: '100%',
    height: '75%',
    resizeMode: 'cover',
  },
  infoContainer: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  movieTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  watchOptionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  watchOptionsTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  providersContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerItem: {
    backgroundColor: '#f8f9fa',
    padding: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  providerLogo: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  noProvidersText: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: 13,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
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
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonWrapper: {
    paddingHorizontal: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
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
    borderWidth: 1.5,
    borderColor: '#ff4b4b',
  },
  likeButton: {
    backgroundColor: '#f0fff0',
    borderWidth: 1.5,
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
    zIndex: 8,
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
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
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
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 18,
    width: 36,
    height: 36,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    gap: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    padding: 1,
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
    fontSize: 2,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
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
    fontSize: 1,
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
    textAlign: 'center',
  },
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  welcomeIcon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  welcomeButtonContainer: {
    width: '100%',
    gap: 20,
    marginTop: 40,
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    height: 72,
  },
  joinButton: {
    flexDirection: 'row',
    backgroundColor: '#5856D6',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 72,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonTextContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonPrimaryText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonSecondaryText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
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
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 1,
    paddingHorizontal: 1,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  joinButton: {
    backgroundColor: '#5856D6',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detailModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },

  detailModalScroll: {
    flex: 1,
  },

  heroSection: {
    height: 45,
    position: 'relative',
  },

  detailPoster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },

  detailContent: {
    marginTop: -40,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingTop: 30,
  },

  titleSection: {
    marginBottom: 1,
  },

  detailTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },

  detailYear: {
    fontSize: 18,
    color: '#666',
  },

  ratingSection: {
    flexDirection: 'row',
    marginBottom: 20,
  },

  detailRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFE5B4',
  },

  detailRating: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B8860B',
  },

  detailSection: {
    marginBottom: 25,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 15,
  },

  detailProviders: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },

  detailProviderItem: {
    alignItems: 'center',
    width: 80,
  },

  detailProviderLogo: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginBottom: 5,
  },

  detailProviderName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
  },

  detailOverview: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
  },

  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },

  detailGridItem: {
    flex: 1,
    minWidth: 150,
  },

  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },

  detailValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },

  safeAreaContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },

  loadingText: {
    fontSize: 16,
    color: '#666',
  },

  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },

  modalScroll: {
    flex: 1,
  },

  modalHero: {
    height: 400,
    position: 'relative',
  },

  modalBackdrop: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  closeButton: {
    position: 'absolute',
    top: 44,
    right: 16,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },

  modalTitle: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  modalContent: {
    padding: 20,
    gap: 24,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 10,
  },

  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statText: {
    fontSize: 16,
    color: '#444',
    fontWeight: '600',
  },

  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#ddd',
  },

  section: {
    gap: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },

  overview: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
  },

  providersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  modalProviderItem: {
    alignItems: 'center',
    width: 80,
  },

  modalProviderLogo: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginBottom: 6,
  },

  providerName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
  },

  darkOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
});