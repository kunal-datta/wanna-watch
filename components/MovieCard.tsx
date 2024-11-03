import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { TMDB_IMAGE_BASE_URL } from '../config/env';

interface Provider {
  provider_name: string;
  logo_path: string;
}

interface MovieCardProps {
  title: string;
  posterPath: string;
  overview: string;
  voteAverage: number;
  providers: Provider[];
}

export const MovieCard = ({ 
  title, 
  posterPath, 
  overview,
  voteAverage,
  providers 
}: MovieCardProps) => {
  console.log('Rendering MovieCard:', { title, posterPath });

  return (
    <ScrollView style={styles.card}>
      <Image
        source={{ uri: `${TMDB_IMAGE_BASE_URL}${posterPath}` }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.rating}>Rating: ⭐️ {voteAverage.toFixed(1)}/10</Text>
        <Text style={styles.overview}>{overview}</Text>
        
        {providers?.length > 0 && (
          <View style={styles.providersContainer}>
            <Text style={styles.sectionTitle}>Available on</Text>
            {providers.map((provider, index) => (
              <View key={provider.provider_id || index} style={styles.providerItem}>
                <Image
                  source={{ uri: `${TMDB_IMAGE_BASE_URL}${provider.logo_path}` }}
                  style={styles.providerLogo}
                  resizeMode="cover"
                />
                <Text style={styles.providerName}>{provider.provider_name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    margin: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
  },
  image: {
    width: '100%',
    height: 500,
  },
  content: {
    padding: 20,
    flex: 1,
    overflow: 'auto',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  rating: {
    fontSize: 18,
    marginBottom: 16,
  },
  overview: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  providersContainer: {
    marginTop: 16,
  },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerLogo: {
    width: 30,
    height: 30,
    marginRight: 8,
    borderRadius: 15,
  },
  providerName: {
    fontSize: 16,
  },
}); 