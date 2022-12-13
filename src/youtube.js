const getOAuth2Client = require("./auth");
const { google } = require('googleapis');
const fs = require('fs');

function getChannel(auth) {
    var service = google.youtube('v3');
    service.channels.list({
      auth: auth,
      part: 'snippet,contentDetails,statistics',
      forUsername: 'GoogleDevelopers'
    }, 
    function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var channels = response.data.items;
        if (channels.length == 0) {
            console.log('No channel found.');
        } else {
            console.log('This channel\'s ID is %s. Its title is \'%s\', and ' +
                        'it has %s views.',
                        channels[0].id,
                        channels[0].snippet.title,
                        channels[0].statistics.viewCount);
        }
    });
}

async function addNewStream(auth) {
    var service = google.youtube('v3');
    service.liveBroadcasts.insert({
      auth: auth,
      part:'snippet,contentDetails,status',
      resource:{
          'contentDetails': {
            'enableClosedCaptions': true,
            'enableContentEncryption': true,
            'enableDvr': true,
            'enableEmbed': true,
            'recordFromStart': true,
            'enableAutoStart': true,
            'enableAutoStop': true,
            'startWithSlate': false,
          },
          'snippet': {
            'title': 'Test broadcast',
            'scheduledStartTime': '2022-12-21T19:00:00Z',
          },
          'status': {
            'privacyStatus': 'unlisted',
            // 'privacyStatus': 'public',
            'selfDeclaredMadeForKids': true
          }
        }
    }, 
    async function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        if (response.data.length == 0) {
            console.log('Failed...');
        } else {
            await upload_thumbnail(auth, response.data['id'], "./thumbnails/mythumbnail.jpeg")
            return response.data['id'];
        }
    });
}

function myFunction(item) {
    console.log(item)
    // console.log(item['cdn'])
    // console.log(item['contentDetails'])
    // console.log(item['status'])
}

async function liveBroadcasts(auth) {
    var service = google.youtube('v3');
    service.liveBroadcasts.list({
      auth: auth,
      part:'id,snippet,contentDetails,status',
      broadcastStatus: 'upcoming'
    }, 
    async function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        if (response.data.length == 0) {
            console.log('Failed...');
        } else {
            response['data']['items'].forEach(myFunction);
            // foreach(LiveStream in response.data)
            // {
            //     StreamKey= lvStream.Cdn.IngestionInfo.StreamName);
            // }
                
        }
    });
}

async function liveStreams(auth) {
    var service = google.youtube('v3');
    service.liveStreams.list({
      auth: auth,
      part:'id,snippet,contentDetails,cdn,status',
      mine: true
    }, 
    async function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        if (response.data.length == 0) {
            console.log('Failed...');
        } else {
            response['data']['items'].forEach(myFunction);
            // foreach(LiveStream in response.data)
            // {
            //     StreamKey= lvStream.Cdn.IngestionInfo.StreamName);
            // }
                
        }
    });
}


async function upload_thumbnail(auth,id,file) {
    console.log('id',id)
    var service = google.youtube('v3');
    service.thumbnails.set({
      auth: auth,
      videoId: id,
      media: {
        mimeType: "image/jpeg",
        body: fs.createReadStream(file),
      },
    }, 
    function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        if (response.data.length == 0) {
            console.log('Failed...');
        } else {
            console.log(response.data);
        }
    });
}

async function insertLiveBroadcast() {
    const auth = await getOAuth2Client();
    //console.log(auth.credentials.access_token)
    // getChannel(auth)
    id = await addNewStream(auth)
    
}

async function insertLiveBroadcastlist() {
    const auth = await getOAuth2Client();
    //console.log(auth.credentials.access_token)
    // getChannel(auth)
    id = await liveBroadcasts(auth)
    id = await liveStreams(auth)
    
}

//insertLiveBroadcast();  
//insertLiveBroadcastlist()

module.exports = {
    insertLiveBroadcast,
    insertLiveBroadcastlist
}