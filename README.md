# MMM-HA-NowPlaying

A Magic Mirror module that displays currently playing media from Home Assistant with a beautiful progress slider and album art.

## Features

- 🎵 **Real-time media display** - Shows current song, artist, and album
- ⏱️ **Progress slider** - Spotify-style progress bar with current/total time
- 🖼️ **Album art** - Displays album artwork as background and thumbnail
- 🔄 **Auto-updates** - Smooth real-time progress updates
- 📱 **Responsive design** - Works on different screen sizes
- 🎨 **Modern UI** - Clean, professional appearance

## Screenshots

*Coming soon*

## Installation

### 1. Clone the repository

Navigate to your Magic Mirror modules directory:
```bash
cd ~/MagicMirror/modules
```

Clone this repository:
```bash
git clone https://github.com/andriarnarson/MMM-HA-NowPlaying.git
```

### 2. Install dependencies

Navigate to the module directory:
```bash
cd MMM-HA-NowPlaying
```

Install dependencies:
```bash
npm install
```

## Configuration

### 1. Get Home Assistant Long-Lived Access Token

1. Open your Home Assistant instance
2. Go to **Profile** (bottom left)
3. Scroll down to **Long-Lived Access Tokens**
4. Click **Create Token**
5. Give it a name (e.g., "Magic Mirror")
6. Copy the generated token

### 2. Add module to Magic Mirror config

Add the following to your `config.js` file in the modules array:

```javascript
{
    module: "MMM-HA-NowPlaying",
    position: "bottom_right", // or wherever you prefer
    config: {
        haIP: "192.168.1.100",        // Your Home Assistant IP address
        haPort: 8123,                 // Home Assistant port (usually 8123)
        sensor: "media_player.appletv", // Your media player entity ID
        updateInterval: 10000,        // Update interval in milliseconds
        showAlbumArt: true,           // Show album artwork
        haToken: "your_long_lived_access_token_here"
    }
}
```

### 3. Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `haIP` | String | `"localhost"` | Home Assistant IP address |
| `haPort` | Number | `8123` | Home Assistant port |
| `sensor` | String | `"media_player.appletv"` | Media player entity ID |
| `updateInterval` | Number | `10000` | How often to fetch data (ms) |
| `showAlbumArt` | Boolean | `true` | Show album artwork |
| `haToken` | String | `""` | Long-lived access token |

### 4. Find Your Media Player Entity ID

1. In Home Assistant, go to **Settings** → **Devices & Services**
2. Look for your media player (Apple TV, Spotify, etc.)
3. Click on it and note the entity ID (e.g., `media_player.appletv`, `media_player.spotify`)

## Supported Media Players

This module works with any Home Assistant media player that provides:
- `media_title` - Song/track title
- `media_artist` - Artist name
- `media_album_name` - Album name
- `media_position` - Current position in seconds
- `media_duration` - Total duration in seconds
- `entity_picture` - Album art URL

Common supported players:
- Apple TV
- Spotify
- Plex
- Kodi
- Chromecast
- Sonos

## Troubleshooting

### Module not showing up
- Check that the module is properly configured in `config.js`
- Ensure the module name matches the directory name exactly
- Check Magic Mirror logs for errors

### No media information displayed
- Verify your media player entity ID is correct
- Check that media is actually playing
- Ensure your Home Assistant token has proper permissions

### Progress bar not updating
- Make sure your media player provides `media_position` and `media_duration`
- Check that the media player state is "playing"

### Album art not showing
- Verify `showAlbumArt` is set to `true`
- Check that your media player provides `entity_picture`
- Ensure network connectivity to Home Assistant

### CSS not updating
- Clear browser cache
- Restart Magic Mirror
- Check file permissions

## Development

### File Structure
```
MMM-HA-NowPlaying/
├── MMM-HA-NowPlaying.js    # Main module file
├── MMM-HA-NowPlaying.css   # Styles
├── node_helper.js          # Backend helper
├── package.json            # Dependencies
└── README.md              # This file
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by MMM-Spotify design
- Built for Magic Mirror community
- Uses Home Assistant REST API

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Search existing issues on GitHub
3. Create a new issue with detailed information

---

**Enjoy your new Now Playing module! 🎵**
