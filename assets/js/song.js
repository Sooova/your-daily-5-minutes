// Important note: For the purpose of the technologies
// usable in the project we are using local storage
// and javascript call outs when handling Auth tokens
// and Private Key API calls to spotify
// In a production build, these would be stored in back-end
// services, as to not expose PK and Auth Token info to the public

// Vars for where we are storing authorization tokens in local storage
const LS_USR_ACCESS_TOKEN = 'ydfmSpotifyUserAccessToken'; // access token used for user driven Spotify API Requests
const LS_USR_REFRESH_TOKEN = 'ydfmSpotifyUserRefreshToken'; // refresh token used for to regenerate User Access Tokens
const LS_CLIENT_ACCESS_TOKEN = 'ydfmSpotifyUserAccessToken'; // access token used for user driven Spotify API Requests
const LS_REDIRECT_URI = 'ydfmSpotifyRedirectURI'; // access token used for user driven Spotify API Requests

var is_authorized_preimum = false;
var spotify_sdk_ready = false;

// update variable when spotify sdk is ready
window.onSpotifyWebPlaybackSDKReady = () => {
    spotify_sdk_ready = true;
}

function init(){
    // try load the player
    initPlayer();

}

// function to attempt loading the Spotify Web Player
function initPlayer(){
    // check if the user is authorized
    if(!isAuthorized){
        //if not authorized
        // display functionality to connect spotify premium
        showConnectSpotify();
    }else{
        // if authorized
        // then check if they have premium
        var isPremiumUser = await isPremium();
        if(!isPremiumUser){
            // if not premium, don't load the player
            // display any notifications regarding basic accounts not supported
            // for player functionality
            showNotPremium();
        } else {
            // if premium try load the player
            is_authorized_preimum = true;
            loadPlayer();
        }
    }
}

// function to check if user has Authorized the app to their spotify account
function isAuthorized(){
    if(localStorage.getItem(LS_USR_ACCESS_TOKEN) === null){
        is_authorized_preimum = false;
        return false;
    }
    // assume if an access token exists the user has authorized spotify
    return true;
}

// function to check if spotify user is premium
async function isPremium(){
    // refresh the user token
    await refreshToken();

    // make api call to check user details
    var response = await fetch(`https://api.spotify.com/v1/me`,{
        method: 'GET',
        headers: {
            'Content-Type':'application/x-www-form-urlencoded',
            'Authorization':'Bearer ' +localStorage.getItem('SpotifyAccessToken'),
        },
    });
    var data = response.json();

    //check if the user is a premium user
    if(data.hasOwnProperty('product') && data['product'] === 'premium'){
        spotify_user_premium = true;
        return true;
    }
    return false;
}

async function refreshToken(){
    // in any production implementation we would call a webservice endpoint on our end that
    // makes this call server to server.
    // for the purpose of this assignment we will just be making the call from the client
    // NOT recommended in production because it exposes the Cient Secret
    var refresh_token = localStorage.getItem('SpotifyRefreshToken')
    var response = await fetch(`https://accounts.spotify.com/api/token?grant_type=refresh_token&refresh_token=${refresh_token}`,{
        method: 'POST',
        headers: {
            'Content-Type':'application/x-www-form-urlencoded',
            'Authorization':'basic ZjBmYTMzMDFjNjUyNDdmNTkxZjc1N2YyODhkNzFlMDE6Y2MxMjU0NTQ3YjE3NGVhZDk2MzM2OGQ3NDliYWJkYWQ='
          },
    });
    var data = response.json();
    localStorage.setItem('SpotifyAccessToken', data['access_token']);
    if(data.hasOwnProperty('refresh_token'))
        localStorage.setItem('SpotifyRefreshToken', data['refresh_token']);
}

function showConnectSpotify(){
    // display elements for connecting spotify
}


function loadPlayer() {
    if(!spotify_sdk_ready){
        // if sdk is not ready, retry later
        setTimeout(loadPlayer, 500);
    }else if (localStorage.getItem('SpotifyAccessToken')){
        //if ready
        if(spotify_user_premium)
        {
            refreshToken().then( () => {
                const token = localStorage.getItem('SpotifyAccessToken');
                player = new Spotify.Player({
                    name: 'Your Daily 5 minutes Spotify Web Player',
                    getOAuthToken: cb => { cb(token); }
                });

                // Error handling
                player.addListener('initialization_error', ({ message }) => { console.error(message); });
                player.addListener('authentication_error', ({ message }) => { console.error(message); });
                player.addListener('account_error', ({ message }) => { console.error(message); });
                player.addListener('playback_error', ({ message }) => { console.error(message); });

                // Playback status updates
                player.addListener('player_state_changed', state => { 
                    console.log(state); 
                });

                // Ready
                player.addListener('ready', ({ device_id }) => {
                    player_device_id = device_id;
                    console.log('Ready with Device ID', device_id);
                });

                // Not Ready
                player.addListener('not_ready', ({ device_id }) => {
                    player_device_id = '';
                    console.log('Device ID has gone offline', device_id);
                });

                // Connect to the player!
                player.connect();
            });
        }
    }
};