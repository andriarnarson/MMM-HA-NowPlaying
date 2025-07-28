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
        
        // Add a more frequent timer for progress updates when media is playing
        this.progressTimer = null;
    },

    getStyles: function() {
        return ["MMM-HA-NowPlaying.css"];
    },

    getData: function() {
        this.sendSocketNotification("GET_HA_DATA", this.config);
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "HA_DATA_RECEIVED") {
            this.nowPlaying = payload;
            this.loaded = true;
            this.updateDom();
            
            // Start progress timer if media is playing
            this.startProgressTimer();
        } else if (notification === "HA_DATA_ERROR") {
            Log.error("MMM-HA-NowPlaying: Error from node_helper:", payload);
            this.loaded = true;
            this.nowPlaying = null;
            this.updateDom();
            this.stopProgressTimer();
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
        
        // Get time information
        var currentPosition = attr.media_position || 0;
        var totalDuration = attr.media_duration || 0;

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
            
            var totalTimeLabel = document.createElement("span");
            totalTimeLabel.className = "ha-nowplaying-total-time";
            totalTimeLabel.innerHTML = this.formatTime(totalDuration);
            
            timeLabels.appendChild(currentTimeLabel);
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

    // Start progress timer for smooth updates
    startProgressTimer: function() {
        var self = this;
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
        }
        
        // Only start if media is playing and has duration
        if (this.nowPlaying && this.nowPlaying.attributes && 
            this.nowPlaying.attributes.media_duration > 0 && 
            this.nowPlaying.state === 'playing') {
            
            this.progressTimer = setInterval(function() {
                // Update the progress without fetching new data
                if (self.nowPlaying && self.nowPlaying.attributes) {
                    var attr = self.nowPlaying.attributes;
                    var currentPosition = attr.media_position || 0;
                    var totalDuration = attr.media_duration || 0;
                    
                    // Estimate current position based on time elapsed
                    var now = Date.now();
                    if (!self.lastUpdateTime) {
                        self.lastUpdateTime = now;
                        self.lastPosition = currentPosition;
                    } else {
                        var timeDiff = (now - self.lastUpdateTime) / 1000; // seconds
                        var estimatedPosition = self.lastPosition + timeDiff;
                        
                        // Update the position for display
                        if (estimatedPosition <= totalDuration) {
                            self.nowPlaying.attributes.media_position = estimatedPosition;
                            self.updateDom();
                        } else {
                            // Song finished, stop timer
                            self.stopProgressTimer();
                        }
                    }
                }
            }, 1000); // Update every second
        }
    },

    // Stop progress timer
    stopProgressTimer: function() {
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
        }
        this.lastUpdateTime = null;
        this.lastPosition = null;
    },

    getHeader: function() {
        return "Now Playing";
    },

    suspend: function() {
        clearInterval(this.timer);
        this.stopProgressTimer();
    },

    resume: function() {
        var self = this;
        this.getData();
        this.timer = setInterval(function() {
            self.getData();
        }, this.config.updateInterval);
        this.startProgressTimer();
    }
}); 