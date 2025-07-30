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
        
        // No longer using progress timer - just rely on API updates
    },

    getStyles: function() {
        return ["MMM-HA-NowPlaying.css?v=" + Date.now()];
    },

    getData: function() {
        this.sendSocketNotification("GET_HA_DATA", this.config);
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "HA_DATA_RECEIVED") {
            // Always use the API position
            this.nowPlaying = payload;
            this.loaded = true;
            
            // Debug logging
            if (payload && payload.attributes) {
                Log.info("MMM-HA-NowPlaying: Received data - State:", payload.state, 
                        "Position:", payload.attributes.media_position, 
                        "Duration:", payload.attributes.media_duration,
                        "Title:", payload.attributes.media_title);
                
                // Log all available attributes to see what we're getting
                Log.info("MMM-HA-NowPlaying: All attributes:", JSON.stringify(payload.attributes, null, 2));
            }
            
            this.updateDom();
        } else if (notification === "HA_DATA_ERROR") {
            Log.error("MMM-HA-NowPlaying: Error from node_helper:", payload);
            this.loaded = true;
            this.nowPlaying = null;
            this.updateDom();
        }
    },

    getDom: function() {
        var wrapper = document.createElement("div");
        if (!this.loaded) {
            wrapper.innerHTML = "Loading...";
            return wrapper;
        }
        if (!this.nowPlaying || !this.nowPlaying.attributes) {
            Log.error("MMM-HA-NowPlaying: No data or attributes available");
            wrapper.innerHTML = "No media playing.";
            return wrapper;
        }
        
        var attr = this.nowPlaying.attributes;
        var title = attr.media_title || "Unknown Title";
        var artist = attr.media_artist || "";
        var album = attr.media_album_name || "";
        var artUrl = attr.entity_picture || "";
        
        // Get time information - try different possible attribute names
        var currentPosition = attr.media_position || attr.position || attr.current_position || 0;
        var totalDuration = attr.media_duration || attr.duration || attr.total_duration || 0;

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
            // Force the size with inline styles to override any cached CSS
            img.style.width = "200px";
            img.style.height = "200px";
            img.style.borderRadius = "12px";
            img.style.marginBottom = "15px";
            img.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
            wrapper.appendChild(img);
            
            // Add pause icon overlay if media is paused
            if (this.nowPlaying.state === 'paused') {
                var pauseOverlay = document.createElement("div");
                pauseOverlay.className = "ha-nowplaying-pause-overlay";
                
                var pauseIcon = document.createElement("div");
                pauseIcon.className = "ha-nowplaying-pause-icon";
                pauseIcon.innerHTML = "⏸";
                
                pauseOverlay.appendChild(pauseIcon);
                wrapper.appendChild(pauseOverlay);
            }
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

        // Add progress slider if we have duration information
        if (totalDuration > 0) {
            var progressContainer = document.createElement("div");
            progressContainer.className = "ha-nowplaying-progress-container";
            
            // Time labels (above the progress bar)
            var timeLabels = document.createElement("div");
            timeLabels.className = "ha-nowplaying-time-labels";
            
            var currentTimeLabel = document.createElement("span");
            currentTimeLabel.className = "ha-nowplaying-current-time";
            currentTimeLabel.innerHTML = this.formatTime(currentPosition);
            
            var separator = document.createElement("span");
            separator.className = "ha-nowplaying-time-separator";
            separator.innerHTML = " / ";
            
            var totalTimeLabel = document.createElement("span");
            totalTimeLabel.className = "ha-nowplaying-total-time";
            totalTimeLabel.innerHTML = this.formatTime(totalDuration);
            
            timeLabels.appendChild(currentTimeLabel);
            timeLabels.appendChild(separator);
            timeLabels.appendChild(totalTimeLabel);
            progressContainer.appendChild(timeLabels);
            
            // Progress bar (below the time labels)
            var progressBar = document.createElement("div");
            progressBar.className = "ha-nowplaying-progress-bar";
            
            var progressFill = document.createElement("div");
            progressFill.className = "ha-nowplaying-progress-fill";
            var progressPercent = (currentPosition / totalDuration) * 100;
            progressFill.style.width = progressPercent + "%";
            
            progressBar.appendChild(progressFill);
            progressContainer.appendChild(progressBar);
            
            info.appendChild(progressContainer);
        }

        wrapper.appendChild(info);
        return wrapper;
    },

    // Helper function to format time in MM:SS format
    formatTime: function(seconds) {
        var minutes = Math.floor(seconds / 60);
        var remainingSeconds = Math.floor(seconds % 60);
        return minutes.toString().padStart(2, '0') + ":" + remainingSeconds.toString().padStart(2, '0');
    },





    //getHeader: function() {
    //    return "Now Playing";
    //},

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