const urlParams = new URLSearchParams(window.location.search);

if(urlParams.has('error')){
    //handle an error
} else{
    var code =  urlParams.get('code')

    var redirect_uri = localStorage.getItem(LS_REDIRECT_URI);
    var bearer = 
    fetch(`https://accounts.spotify.com/api/token?grant_type=authorization_code&code=${code}&redirect_uri=${redirect_uri}`,{
        method: 'POST',
        headers: {
            'Content-Type':'application/x-www-form-urlencoded',
            'Authorization':'basic ZjBmYTMzMDFjNjUyNDdmNTkxZjc1N2YyODhkNzFlMDE6Y2MxMjU0NTQ3YjE3NGVhZDk2MzM2OGQ3NDliYWJkYWQ='
            },
    }).then( response => response.json())
    .then(data => {
        localStorage.setItem(LS_USR_ACCESS_TOKEN, data['access_token']);
        localStorage.setItem(LS_USR_REFRESH_TOKEN, data['refresh_token'])
        window.close();
    });

//    window.close();
}

