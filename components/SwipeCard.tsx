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
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  card: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
