# My Twitch Chatbot

My Twitch chatbot with some simple commands, including friendcode display and
currently playing Spotify song.

Probably should be run on a machine since there are tokens involved.

## Install

I'm using node 8.11.3 and npm 6.5.0, but this is probably simple enough to work
with a lot of different versions.

    npm install

## Configure

Add a vars.js here (which is .gitignore'd) in the root directory, with the
following format:

    module.exports = {
      BOT_USER: '[your bot's twitch handle]',
      CHANNEL: '[your channel]',
      GAME_ID: '[your gaming id of choice]'
      TWITCH_TOKEN: '[your twitch oauth token]',
      SPOTIFY_CLIENT_ID: '[your spotify app's client_id]',
      SPOTIFY_CLIENT_SECRET: '[your spotify app's client_secret]',
    }

### Notes

- `BOT_USER` can be the same handle you use for your channel.
- `GAME_ID` example: Nintendo Switch Friend Code
- `TWITCH_TOKEN` can be retrieved from [here](https://twitchapps.com/tmi/) (click the broken image button)
- Register as a [Spotify Developer](https://developer.spotify.com/) to obtain a
  `SPOTIFY_CLIENT_ID` and a `SPOTIFY_CLIENT_SECRET` for a test app.

## Run

    npm start
