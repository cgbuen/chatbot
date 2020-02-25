# Twitch Chatbot / Endpoint Server

My locally-running Twitch chatbot for some simple commands, including game ID
display, currently-playing Spotify song, shoutouts with real-user checking, and
a fun leaderboard chat game. It also logs the chat.

This also has evolved into a means by which to serve API endpoints, since much
of the data needed for the chatbot to respond with can be reused into Express
responses that can be consumed by _another_ locally running server for a web
application. This, for example, could be useful for a broadcast overlay.

The endpoints gather data from the following sources:

- Spotify API (for currently playing song)
- Twitch API (for followers, bits, and subs)
- Nintendo / Splatoon API (for gear, ranks, and other stats)
- Your own local machine (for chat game stats, uptime, and other possible
  hardcoded data)

## Register Developer Apps

One benefit of this project is that it allows you to not have to depend on your
own machine's Spotify desktop client application when looking for the song
that's currently being played, but instead Spotify's API data that they have on
you, as you're playing music.

Note that Spotify's API requires OAuth 2.0 to get any user data, which makes for
a somewhat complicated authentication process (it in fact requires the use of an
actual Spotify developer app). The directions here allow you to quickly stand up
your own app (it does not have to be published), so that you're authenticating
to what you've made yourself, rather than someone else's live developer app.

Similar functionality has been added for the new Twitch API, which also uses
OAuth 2.0. The purpose here is solely for spitting out tokens for gathering the
followers / bits / endpoint data.

1. Register as a [Spotify Developer](https://developer.spotify.com/dashboard/login).
2. Create a project by clicking the "Create a Client ID" and filling out all
   the appropriate fields.
3. Go to "Edit Settings" and add `http://localhost:3000/callback-spotify` to the
   whitelist of Redirect URIs.
4. Make note of the app's associated Client ID and Client Secret. These get
   used when configuring this bot later (see the Configure section).
5. Repeat steps 1-4, but for [Twitch](https://dev.twitch.tv/login).

## Install

I'm using node 8.16.0 and npm 5.10.0, but this is probably simple enough to work
with a lot of different versions.

    npm install

## Configure

Add a vars.js here (which is .gitignore'd) in the root directory, with the
following format:

    module.exports = {
      BOT_USER: '[your bot's twitch handle]',
      CHANNEL: '[your channel]',
      GAME_ID: '[your gaming id of choice]',
      SPOTIFY_CLIENT_ID: '[your spotify app's client_id]',
      SPOTIFY_CLIENT_SECRET: '[your spotify app's client_secret]',
      TWITCH_CLIENT_ID: '[your twitch app's client_id]',
      TWITCH_CLIENT_SECRET: '[your twitch app's client_secret]',
      DISCORD: '[link to your discord server]',
      COUNTER: '[extension-less filename for local JSON counter file]',
      TOKEN_STORE: '[local directory where tokens are stored]'
    }

### Notes

- `BOT_USER` can be the same handle you use for your channel (`CHANNEL`).
- `GAME_ID` example: Nintendo Switch Friend Code
- Write your `TOKEN_STORE` value into a new line in _.gitignore_

## Run

    npm start
