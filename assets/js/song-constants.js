
// Vars for where we are storing authorization tokens in local storage
const LS_USR_ACCESS_TOKEN = 'ydfmSpotifyUserAccessToken'; // access token used for user driven Spotify API Requests
const LS_USR_REFRESH_TOKEN = 'ydfmSpotifyUserRefreshToken'; // refresh token used for to regenerate User Access Tokens
const LS_CLIENT_ACCESS_TOKEN = 'ydfmSpotifyClientAccessToken'; // access token used for user driven Spotify API Requests
const LS_REDIRECT_URI = 'ydfmSpotifyRedirectURI'; // access token used for user driven Spotify API Requests
const LS_SONG_PREF_REC_SEED = 'ydfmSpotifyRecSeedArtistTrack';

const SPOTIFY_AUTH_REDIRECT_PAGE = 'complete-spotify-auth.html'; // page that handles the redirect for spotify authorization