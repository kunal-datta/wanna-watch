import React, { useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { MovieCard } from './MovieCard';

interface SwipeCardProps {
  movie: any;
  providers: any[];
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  containerWidth: number;
}

export const SwipeCard = ({ 
  movie, 
  providers, 
  onSwipeLeft, 
  onSwipeRight, 
  containerWidth 
}: SwipeCardProps) => {
  const cardWidth = Math.floor(containerWidth * 0.9);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        onSwipeRight();
      } else if (event.key === 'ArrowLeft') {
        onSwipeLeft();
      }
    };

    if (Platform.OS === 'web') {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (Platform.OS === 'web') {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [onSwipeLeft, onSwipeRight]);

  return (
    <View style={[styles.container, { width: containerWidth }]}>
      <View style={[styles.card, { width: cardWidth }]}>
        <MovieCard
          title={movie.title}
          posterPath={movie.poster_path}
          overview={movie.overview}
          voteAverage={movie.vote_average}
          providers={providers}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 400,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  overview: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  rating: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  providersContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  providerLogo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  providerName: {
    fontSize: 16,
    color: '#666',
  },
});
