# Wanna Watch

## Installation

Make sure you have [Node.js](https://nodejs.org/) and [Yarn](https://yarnpkg.com/) installed on your machine.

```
yarn install
```


## Running the App

### Backend

```
cd backend
poetry run uvicorn src.server:app --reload --port 8000
```

You can run the app in different modes:

### Development Mode

#### Checkout frontend
```
cd frontend
```

#### Install dependencies
```
yarn install
```

#### Start Expo development server
`yarn expo start`

#### Start directly in web browser
`yarn expo start --web`

#### Start on iOS
`yarn expo start --ios`

#### Start on Android
`yarn expo start --android`

### Using Expo Go App

1. Install Expo Go on your mobile device:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Start the development server:
`yarn expo start`

3. Scan the QR code with:
   - iOS: Use the device's camera
   - Android: Use the Expo Go app's QR scanner

### Making Backend Requests

#### Get Trending Movies
```
curl -XGET "http://localhost:8000/api/movies/trending"
```

#### Get Streaming Availability
```
curl -XGET "http://localhost:8000/api/movies/streaming?movie_ids=1244492&movie_ids=933260"
```

## Building and Running the Container

```
./scripts/build-container.sh
./scripts/run-container.sh
```

This will build the container and run it, exposing port 80.


## Requirements

- Node.js
- Yarn
- iOS Simulator (for iOS development)
- Android Studio (for Android development)
- Expo Go app (for mobile device testing)
