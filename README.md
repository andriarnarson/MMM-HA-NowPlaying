# MMM-HA-NowPlaying

A MagicMirror module that displays now-playing media from Home Assistant, with album art, scrolling track info, a live progress bar, and fallback support for multiple media players.

![Screenshot](screenshot.png)

## Features

- Album art with blurred background card effect
- Live progress bar and timestamp that ticks every second
- Scrolling text for long titles, artists, and album names
- Pause overlay icon when media is paused
- Fallback to a secondary media player when the primary is idle
- Hides gracefully when nothing is playing (optional)

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/andriarnarson/MMM-HA-NowPlaying.git
cd MMM-HA-NowPlaying
npm install
```

## Configuration

Add to your `config.js`:

```javascript
{
    module: "MMM-HA-NowPlaying",
    position: "bottom_center",
    config: {
        haIP: "192.168.1.100",
        haPort: 8123,
        haToken: "your_long_lived_access_token",
        sensor: "media_player.appletv",
        fallbackSensor: "media_player.appletv_bedroom", // optional
    }
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `haIP` | String | `"localhost"` | Home Assistant IP or hostname |
| `haPort` | Number | `8123` | Home Assistant port |
| `haToken` | String | `""` | Long-lived access token |
| `sensor` | String | `"media_player.appletv"` | Primary media player entity ID |
| `fallbackSensor` | String | `""` | Secondary entity to show when primary is idle |
| `updateInterval` | Number | `10000` | How often to poll HA in milliseconds |
| `showAlbumArt` | Boolean | `true` | Show album artwork |
| `hideWhenIdle` | Boolean | `false` | Hide the module when nothing is playing |

### Getting a Home Assistant token

1. Open Home Assistant and go to your **Profile**
2. Scroll to **Long-Lived Access Tokens** and click **Create Token**
3. Copy the token and paste it into `haToken`

### Finding your entity ID

In Home Assistant go to **Settings → Devices & Services**, find your media player, and note the entity ID (e.g. `media_player.appletv`, `media_player.spotify`).

## Supported media players

Works with any HA media player that exposes standard attributes. Known to work well with:

- Apple TV (Spotify, Disney+, and other apps that expose metadata)
- Spotify (via HA Spotify integration)
- Plex, Kodi, Chromecast, Sonos

> **Note:** Some apps (e.g. Netflix on Apple TV) do not expose track metadata to Home Assistant. The module will not show title/art for those.

## Troubleshooting

**Module shows "No media playing." even when something is playing**
- Verify the entity ID is correct in your config
- Check the entity state in HA Developer Tools → States
- Make sure the media player reports `state: playing`, `paused`, or `buffering`

**Progress bar is static**
- The media player must provide `media_position` and `media_duration` attributes
- Some apps/integrations don't expose these

**Album art not showing**
- Check that your media player provides an `entity_picture` attribute
- Verify HA is reachable from the MagicMirror device

**Nothing showing at all**
- Check MagicMirror logs: `journalctl -u MagicMirror -f`
- Verify your `haIP`, `haPort`, and `haToken` are correct
