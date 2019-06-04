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
      TWITCH_TOKEN: '[your twitch oauth token]',
      SPOTIFY_TOKEN: '[your spotify account's oauth token]',
      GAME_ID: '[your gaming id of choice, e.g. nintendo switch friend code]'
    }

### Notes

- `BOT_USER` can be the same handle you use for your channel.
- `TWITCH_TOKEN` can be retrieved from [here](https://twitchapps.com/tmi/) (click the broken image button)
- `SPOTIFY_TOKEN` can be retrieved from [here](https://developer.spotify.com/console/get-users-currently-playing-track/)

## Run

    npm start
