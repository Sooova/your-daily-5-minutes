// Important note: For the purpose of the technologies
// usable in the project we are using local storage
// and javascript call outs when handling Auth tokens
// and Private Key API calls to spotify
// In a production build, these would be stored in back-end
// services, as to not expose PK and Auth Token info to the public

var is_authorized_preimum = false;
var spotify_sdk_ready = false;

var song_recommendations = [];

var player; // spotify player object

// update variable when spotify sdk is ready
window.onSpotifyWebPlaybackSDKReady = () => {
    spotify_sdk_ready = true;
}

initSongs();

function initSongs(){
    // try load the player
    initAuthorizedFeatures();

    getSpotifyClientCredentials()
    //refresh Token every hour
    setInterval(getSpotifyClientCredentials, 1000 * 60 * 60);

    

}

// function to attempt loading the Spotify Web Player
async function initAuthorizedFeatures(){
    // check if the user is authorized
    if(!isAuthorized()){
        //if not authorized
        // display functionality to connect spotify premium
        showConnectSpotify();
    }else{
        // if authorized

        // initialize features for linked accounts (premium and basic)
        initLinkedFeatures();

        // check if they have premium
        var isPremiumUser = await isPremium();
        console.log('isPremium()', isPremiumUser);
        if(!isPremiumUser){
            // if not premium, don't load the player
            // display any notifications regarding basic accounts not supported
            // for player functionality
            //showNotPremium();
        } else {
            // if premium try load the player
            is_authorized_preimum = true;
            loadPlayer();

            // set listener for play buttons
            console.log('setting listener')
            $(document).on('click','.play-song', function (e) {
                e.preventDefault();
                console.log('event fired')
                playSong($(this).val());
            });

        }
    }

    // load Song Recommendations
    generateSongRecommendations();

}

const play = ({
    spotify_uri,
    playerInstance: {
      _options: {
        getOAuthToken,
      }
    }
  }) => {
    getOAuthToken(access_token => {
      fetch(`https://api.spotify.com/v1/me/player/play?device_id=${player_device_id}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [spotify_uri] }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
      });
    });
  };


function playSong(play_uri){
    console.log('playing '+play_uri);
    play({
        playerInstance: player,
        spotify_uri: play_uri,
      });
}


async function generateSongRecommendations(){
    var sArtists = "";
    var sGenre = "";
    var sTracks = "";
    $('.spotify-pref').val().forEach(val => {
        switch(val.split("-")[0].toLowerCase()){
            case 'artist':
                if(sArtists === "")
                    sArtists = "&seed_artists=" + val.split("-")[1];
                else
                    sArtists += "," + val.split("-")[1];
                break;
            case 'track':
                if(sTracks === "")
                    sTracks = "&seed_tracks=" + val.split("-")[1];
                else
                    sTracks += "," + val.split("-")[1];
                break;
            case 'genre':
                if(sGenre === "")
                    sGenre = "&seed_genres=" + val.split("-")[1];
                else
                    sGenre += "," + val.split("-")[1];
                break;
            
        }
    })
    // returns array of {label: "Spotify Object Name [Type]", value: "<Spotify Type>-spotify object ID"}
    var bearer = 'Bearer ' + await getSpotifyClientCredentials();
    var response = await fetch(`https://api.spotify.com/v1/recommendations?market=AU&limit=15&max_duration_ms=300000${sArtists+sTracks+sGenre}`,{
        method: 'GET',
        headers: {
            'Content-Type':'application/x-www-form-urlencoded',
            'Authorization': bearer
          },
    });
    var data = {};
    if (response.ok)
        data = await response.json()

    $('#song-rec').empty();
    // go through returned tracks
    data.tracks.forEach((track) => {
        var artists = "";
        //process artists
        track.artists.forEach((artist) => {
            if (!(artists === ""))
                artists += ", ";
            artists += artist.name;
        });     
        displaySong(track.name, artists, track.album.name, track.external_urls.spotify, track.uri);
    })

}

function displaySong(title, artists, album, open_link, play_uri){

    const elLi = $('<li>');
    const elTitle = $('<h3>');
    const elArtists= $('<h5>');
    const elAlbum = $('<h4>');
    const linkOpen = $('<a>');
    const linkPlay = $('<button>');
    elTitle.text(title);
    elAlbum.text(album);
    elArtists.text(artists);
    linkOpen.attr('href', open_link);
    linkOpen.text('[Spotify URL]');
    linkPlay.text('[Play Song]');
    linkPlay.addClass('play-song');
    linkPlay.val(play_uri);
    elLi.append(elTitle);
    elLi.append(elArtists);
    elLi.append(elAlbum);
    elLi.append(linkOpen);
    elLi.append(linkPlay);
    $('#song-rec').append(elLi);

}

function initLinkedFeatures(){
    $(".song-is-authorized").show();

    // load the pillbox for saving artist and track recommendations
    $("select.spotify-pref").select2({
        placeholder: 'Select up to five artists or songs to base recommendations on...',
        maximumSelectionLength:5,
        ajax: {
            url: "https://api.spotify.com/v1/search",
            dataType: 'json',
            delay: 250,
            data: function (params) {
              return {
                q: params.term, // search term
                type: "album,track,artist",
                limit: 5,
              };
            },
            headers: {
                'Content-Type':'application/x-www-form-urlencoded',
                "Authorization": 'Bearer ' + localStorage.getItem(LS_CLIENT_ACCESS_TOKEN)
              },
            processResults: function (data, params) {
              // parse the results into the format expected by Select2
              // since we are using custom formatting functions we do not need to
              // alter the remote JSON data, except to indicate that infinite
              // scrolling can be used
              
              var returnList = [];
              if (data.hasOwnProperty('artists'))
                  returnList = returnList.concat({"text": "Artists", "children": processSearchType(data['artists']["items"])});
              if (data.hasOwnProperty('albums'))
                  returnList = returnList.concat({"text": "Albums", "children": processSearchType(data['albums']["items"])});
              if (data.hasOwnProperty('tracks'))
                  returnList = returnList.concat({"text": "Tracks", "children": processSearchType(data['tracks']["items"])});
              if (returnList.length === 0)
                  returnList = [];
              console.log(returnList);
              var returnSearchResults = {"results": returnList}
              return returnSearchResults;
        
            //   params.page = params.page || 1;
            //   return {
            //     results: data.items,
            //     pagination: {
            //       more: (params.page * 30) < data.total_count
            //     }
            //   };
            },
            cache: true
          },
          minimumInputLength: 1
    });

    // load previously saved preferences
    loadSongPref();
}

function processSearchType(arr){
    var retArray = [];
    arr.forEach( obj => {
        // return a list of labels and values for a given array of spotify objects
        retArray.push({text: `${obj.name}`, id: `${obj.type}-${obj.id}`});
    })
    console.log(retArray);
    return retArray;
}

// function to check if user has Authorized the app to their spotify account
function isAuthorized(){
    console.log('LS_USR_ACCESS_TOKEN===',LS_USR_ACCESS_TOKEN)
    if(localStorage.getItem(LS_USR_ACCESS_TOKEN) === null || localStorage.getItem(LS_USR_ACCESS_TOKEN) === 'undefined' ){
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
            'Authorization':'Bearer ' +localStorage.getItem(LS_USR_ACCESS_TOKEN),
        },
    });
    var data = await response.json();

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
    var refresh_token = localStorage.getItem(LS_USR_REFRESH_TOKEN)
    var response = await fetch(`https://accounts.spotify.com/api/token?grant_type=refresh_token&refresh_token=${refresh_token}`,{
        method: 'POST',
        headers: {
            'Content-Type':'application/x-www-form-urlencoded',
            'Authorization':'basic ZjBmYTMzMDFjNjUyNDdmNTkxZjc1N2YyODhkNzFlMDE6Y2MxMjU0NTQ3YjE3NGVhZDk2MzM2OGQ3NDliYWJkYWQ='
          },
    });
    var data = await response.json();
    console.log('data',data)
    localStorage.setItem(LS_USR_ACCESS_TOKEN, data['access_token']);
    if(data.hasOwnProperty('refresh_token'))
        localStorage.setItem(LS_USR_REFRESH_TOKEN, data['refresh_token']);
}

function showConnectSpotify(){
    // display elements for connecting spotify
    console.log("hiding song is authorized")
    $(".song-is-authorized").hide();
    $(".song-not-authorized").show();
}


function loadPlayer() {
    if(!spotify_sdk_ready){
        // if sdk is not ready, retry later
        setTimeout(loadPlayer, 500);
    }else if (localStorage.getItem(LS_USR_ACCESS_TOKEN)){
        //if ready
        if(spotify_user_premium)
        {
            refreshToken().then( () => {
                const token = localStorage.getItem(LS_USR_ACCESS_TOKEN);
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

async function getSpotifyClientCredentials()
{
    // note this should be a call to a back-end service to return this, not a front end call
    // as the client secret should not be exposed in a production site
    const response = await fetch(`https://accounts.spotify.com/api/token?grant_type=client_credentials`,{
        method: 'POST',
        headers: {
            'Content-Type':'application/x-www-form-urlencoded',
            'Authorization':'basic ZjBmYTMzMDFjNjUyNDdmNTkxZjc1N2YyODhkNzFlMDE6Y2MxMjU0NTQ3YjE3NGVhZDk2MzM2OGQ3NDliYWJkYWQ='
          },
    });
    const data = await response.json();
    localStorage.setItem(LS_CLIENT_ACCESS_TOKEN, data['access_token'])
    return data['access_token'];
}

function authorizeSpotifyUser(client_id, redirect_page, scope){


    var redirect_uri = encodeURIComponent(window.location.href.split('/').slice(0, 3).join('/') + '/' + redirect_page);

    // store the location in local storage, this is used when getting the access token
    localStorage.setItem(LS_REDIRECT_URI,redirect_uri)
    return `https://accounts.spotify.com/authorize?client_id=${client_id}&response_type=code&redirect_uri=${redirect_uri}&scope=${scope}`;

}

function linkSpotifyAccount(){
    window.open(authorizeSpotifyUser('f0fa3301c65247f591f757f288d71e01', SPOTIFY_AUTH_REDIRECT_PAGE, 'streaming%20user-read-private%20user-read-email'));
}

function saveSongPref(){
    var seed_data = $("select.spotify-pref").select2('data');
    localStorage.setItem(LS_SONG_PREF_REC_SEED, JSON.stringify(seed_data));
}

function loadSongPref(){
    if(!(localStorage.getItem(LS_SONG_PREF_REC_SEED) === null || localStorage.getItem(LS_SONG_PREF_REC_SEED) === 'undefined' )){
        var options = JSON.parse(localStorage.getItem(LS_SONG_PREF_REC_SEED));
        var selectBox  = $("select.spotify-pref");
        options.forEach((option) => {
            var option = new Option(option.text, option.id, true, true);
            selectBox.append(option).trigger('change');
            selectBox.trigger({type: 'select2:select', params: {data: option}});
        })
    }
}