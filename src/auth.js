const {google} = require('googleapis');
const open = require('open');
const config = require('config');
const express = require('express');
const fs = require('fs-extra');
const querystring = require("querystring");
const {request} = require("gaxios");

const app = express();

async function getTokensAsync(url,options) {
  // const values = {
  //     client_id: options.client_id,
  //     client_secret:  options.client_secret,
  //     grant_type:  options.grant_type,
  //     refresh_token:  options.refresh_token,
  //     expiry_date: options.expiry_date,
  // };
  const res = request({
      method: 'POST',
      url,
      data: querystring.stringify(options),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res;
}

module.exports = async function getOAuth2Client() {

  const credentialsPath = config.get('credentialsPath');

  const oauth2Client = new google.auth.OAuth2({
    clientId: config.get('google.clientId'),
    clientSecret: config.get('google.clientSecret'),
  });

  const getStoredCredentials = async () => {
    const storedCredentialsExist = await fs.exists(credentialsPath);
    //console.log('storedCredentialsExist:' + storedCredentialsExist)
    if (storedCredentialsExist) {
      const storedCredentialsData = await fs.readJson(credentialsPath);
      if (storedCredentialsData.refresh_token) {
        //console.log('refresh token: ' + storedCredentialsData.refresh_token)
        return storedCredentialsData;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  const storedCredentials = await getStoredCredentials();

  var goodtogo = true;

  // set access code if credentials found:
  if (storedCredentials) {
    oauth2Client.setCredentials(storedCredentials);
  } else {
    goodtogo = false;
  }

  var tokenInfo = false;
  try{
    tokenInfo = await oauth2Client.getTokenInfo(
      oauth2Client.credentials.access_token
    );
  } catch(err){
    //console.log(err);
  }

  if (tokenInfo) {
    console.log('Re-use old codes');

    return new Promise((resolve) => {
      resolve(oauth2Client);
    });
  }

  if (goodtogo) {

    return new Promise((resolve) => {

       async function getToken(){
        
        console.log('Get new access code');

        const options = {
          client_id: config.get('google.clientId'),
          client_secret: config.get('google.clientSecret'),
          grant_type: 'refresh_token',
          refresh_token: storedCredentials['refresh_token'],
          expiry_date: storedCredentials['expiry_date'],
        };
        
        //console.log(options);
        // get new access codes
        data = await getTokensAsync(config.get('google.url'),options)
        
        //update options for saving:
        options.access_token = data['data']['access_token'];
        options.scope = config.get('google.scopes');
        options.expires_in = storedCredentials['expires_in'];
        options.token_type = storedCredentials['token_type'];
        delete options.client_id;
        delete options.client_secret;
        delete options.expiry_date;
        delete options.grant_type;

        // save new codes:
        await fs.writeJson(credentialsPath, options, {spaces: 2});
        console.log(options,data['data']);

        resolve(oauth2Client);
        }

        getToken();
    })

  } else {
    return new Promise((resolve) => {

      // create sign in server:
      const server = app.listen(80, () => {
        //oauth2Client.redirectUri = `http://localhost:${config.get('port')}${config.get('google.redirectUrl')}`;
        oauth2Client.redirectUri = config.get('google.redirect_uris');

        //console.log(config.get('google.redirect_uris'));

        // generate url where you log in
        const authUrl = oauth2Client.generateAuthUrl({
          access_type: config.get('google.access_type'),
          prompt: 'consent',
          //forceRefreshOnFailure: true,
          scope: config.get('google.scopes')
        });
        

        //When signin code is received
        app.get('/', async function (req, res) {

          // get token from callback url and set credentials
          const code = req.query.code;
          //console.log("returned from request")
          //console.log(code)
          
          const options = {
            client_id: config.get('google.clientId'),
            client_secret: config.get('google.clientSecret'),
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: config.get('google.redirect_uris'),
            access_type: config.get('google.access_type'),
            scope: config.get('google.scopes')
          };

          //Get Refresh & Access codes:
          data = await getTokensAsync(config.get('google.url'),options)
          //console.log(data['data']);

          res.send('Authentication successful! Please return to the console.');
          server.close();

          //Save codes:
          await fs.writeJson(credentialsPath, data['data'], {spaces: 2});
          oauth2Client.setCredentials(data['data']);


          //Show access info
          const tokenInfo = await oauth2Client.getTokenInfo(
            oauth2Client.credentials.access_token
          );
          console.log(tokenInfo);
          

          resolve(oauth2Client);
        })

        // open
        //console.log(authUrl);
        console.log('Login');

        //Sign window opens
        open(authUrl);

        //return 'ok';
      })
    })
  }
}
