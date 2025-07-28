Module.register("MMM-HA-NowPlaying", {
    // Default module config.
    defaults: {
        haIP: "localhost",
        haPort: 8123,
        sensor: "media_player.appletv",
        updateInterval: 10000, // ms
        showAlbumArt: true,
        haToken: "", // Long-Lived Access Token
    },

    start: function() {
        Log.info("MMM-HA-NowPlaying: Module started");
        this.nowPlaying = null;
        this.loaded = false;
        this.getData();
        var self = this;
        this.timer = setInterval(function() {
            self.getData();
        }, this.config.updateInterval);
    },

    getStyles: function() {
        return ["MMM-HA-NowPlaying.css"];
    },

    getData: function() {
        Log.info("MMM-HA-NowPlaying: Requesting data from node_helper");
        this.sendSocketNotification("GET_HA_DATA", this.config);
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "HA_DATA_RECEIVED") {
            this.nowPlaying = payload;
            this.loaded = true;
            this.updateDom();
        } else if (notification === "HA_DATA_ERROR") {
            Log.error("MMM-HA-NowPlaying: Error from node_helper:", payload);
            this.loaded = true;
            this.nowPlaying = null;
            this.updateDom();
        }
    },

    getDom: function() {
        Log.info("MMM-HA-NowPlaying: Rendering DOM");
        var wrapper = document.createElement("div");
        if (!this.loaded) {
            wrapper.innerHTML = "Loading...";
            return wrapper;
        }
        if (!this.nowPlaying || !this.nowPlaying.attributes) {
            Log.error("MMM-HA-NowPlaying: No data or attributes available");
            Log.error("MMM-HA-NowPlaying: nowPlaying =", this.nowPlaying);
            wrapper.innerHTML = "No media playing.";
            return wrapper;
        }
        var attr = this.nowPlaying.attributes;
        var title = attr.media_title || "Unknown Title";
        var artist = attr.media_artist || "";
        var album = attr.media_album_name || "";
        var artUrl = attr.entity_picture || "";

        // Set background image if album art is available
        if (this.config.showAlbumArt && artUrl) {
            var fullArtUrl = artUrl.startsWith("/") ? 
                `http://${this.config.haIP}:${this.config.haPort}${artUrl}` : 
                artUrl;
            wrapper.style.setProperty('--album-art-url', `url(${fullArtUrl})`);
        }

        if (this.config.showAlbumArt && artUrl) {
            var img = document.createElement("img");
            // If the artUrl is a relative path, prepend the Home Assistant URL
            if (artUrl.startsWith("/")) {
                img.src = `http://${this.config.haIP}:${this.config.haPort}${artUrl}`;
            } else {
                img.src = artUrl;
            }
            img.className = "ha-nowplaying-albumart";
            wrapper.appendChild(img);
        }

        var info = document.createElement("div");
        info.className = "ha-nowplaying-info";

        var titleDiv = document.createElement("div");
        titleDiv.className = "ha-nowplaying-title";
        titleDiv.innerHTML = title;
        info.appendChild(titleDiv);

        if (artist) {
            var artistDiv = document.createElement("div");
            artistDiv.className = "ha-nowplaying-artist";
            artistDiv.innerHTML = artist;
            info.appendChild(artistDiv);
        }

        if (album) {
            var albumDiv = document.createElement("div");
            albumDiv.className = "ha-nowplaying-album";
            albumDiv.innerHTML = album;
            info.appendChild(albumDiv);
        }

        wrapper.appendChild(info);
        return wrapper;
    },

    getHeader: function() {
        return "Now Playing";
    },

    suspend: function() {
        clearInterval(this.timer);
    },

    resume: function() {
        var self = this;
        this.getData();
        this.timer = setInterval(function() {
            self.getData();
        }, this.config.updateInterval);
    }
});
