Module.register("MMM-HA-NowPlaying", {
    defaults: {
        haIP: "localhost",
        haPort: 8123,
        sensor: "media_player.appletv",
        updateInterval: 10000,
        showAlbumArt: true,
        haToken: "",
        hideWhenIdle: false, // hide module when nothing is playing
        fallbackSensor: "", // fallback media_player entity if primary is idle
    },

    start: function() {
        Log.info("MMM-HA-NowPlaying: Module started");
        this.nowPlaying = null;
        this.loaded = false;
        this._updateTimer = null;
        this._lastRendered = undefined;
        this._hidden = false;
        this.getData();
        this._startTimers();
    },

    _startTimers: function() {
        var self = this;
        clearInterval(this.timer);
        clearInterval(this.progressTimer);
        this.timer = setInterval(function() { self.getData(); }, this.config.updateInterval);
        this.progressTimer = setInterval(function() { self.updateProgress(); }, 1000);
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
        } else if (notification === "HA_DATA_ERROR") {
            Log.error("MMM-HA-NowPlaying: Error:", payload);
            this.loaded = true;
            this.nowPlaying = null;
        } else {
            return;
        }
        var self = this;
        var isActive = this.nowPlaying && this.isActiveState(this.nowPlaying.state);
        if (this._updateTimer) { clearTimeout(this._updateTimer); }
        // Active state updates fast; delay non-active to avoid spurious flashes
        this._updateTimer = setTimeout(function() {
            var active = self.nowPlaying && self.isActiveState(self.nowPlaying.state);
            if (self.config.hideWhenIdle) {
                if (active && self._hidden) { self.show(300); self._hidden = false; }
                else if (!active && !self._hidden) { self.hide(300); self._hidden = true; }
            } else if (self._hidden) {
                self.show(300);
                self._hidden = false;
            }
            if (self._contentChanged()) { self.updateDom(); }
        }, isActive ? 200 : 5000);
    },

    _contentChanged: function() {
        var n = this.nowPlaying;
        var p = this._lastRendered;
        var key = function(x) {
            if (!x) return null;
            var a = x.attributes || {};
            var art = (a.entity_picture || "").split("?")[0];
            return [x.entity_id, x.state, a.media_title, a.media_artist, a.media_album_name, art].join("|");
        };
        var changed = key(n) !== key(p);
        if (changed) { this._lastRendered = n; }
        return changed;
    },

    isActiveState: function(state) {
        return state === "playing" || state === "paused" || state === "buffering";
    },

    getDom: function() {
        var wrapper = document.createElement("div");
        wrapper.className = "ha-nowplaying-card";
        if (!this.loaded) {
            wrapper.innerHTML = "Loading...";
            return wrapper;
        }
        if (!this.nowPlaying || !this.nowPlaying.attributes || !this.isActiveState(this.nowPlaying.state)) {
            wrapper.innerHTML = "No media playing.";
            return wrapper;
        }

        var state = this.nowPlaying.state;
        var attr = this.nowPlaying.attributes;
        var title = attr.media_title || "";
        var artist = attr.media_artist || "";
        var album = attr.media_album_name || "";
        var artUrl = attr.entity_picture || "";

        // Only advance position when actually playing (not paused/buffering)
        var currentPosition = attr.media_position || 0;
        if (state === "playing" && attr.media_position !== undefined && attr.media_position_updated_at) {
            var updatedAt = new Date(attr.media_position_updated_at).getTime();
            var elapsed = (Date.now() - updatedAt) / 1000;
            currentPosition = attr.media_position + elapsed;
            if (attr.media_duration) {
                currentPosition = Math.min(currentPosition, attr.media_duration);
            }
        }
        var totalDuration = attr.media_duration || 0;

        // Set background image if album art is available
        if (this.config.showAlbumArt && artUrl) {
            var fullArtUrl = artUrl.startsWith("/") ? 
                `http://${this.config.haIP}:${this.config.haPort}${artUrl}` : 
                artUrl;
            wrapper.style.setProperty('--album-art-url', `url(${fullArtUrl})`);
        }

        if (this.config.showAlbumArt && artUrl) {
            var artContainer = document.createElement("div");
            artContainer.className = "ha-nowplaying-art-container";

            var img = document.createElement("img");
            if (artUrl.startsWith("/")) {
                img.src = `http://${this.config.haIP}:${this.config.haPort}${artUrl}`;
            } else {
                img.src = artUrl;
            }
            img.className = "ha-nowplaying-albumart";
            img.style.width = "200px";
            img.style.height = "200px";
            artContainer.appendChild(img);

            if (this.nowPlaying.state === 'paused') {
                var pauseOverlay = document.createElement("div");
                pauseOverlay.className = "ha-nowplaying-pause-overlay";
                var pauseIcon = document.createElement("div");
                pauseIcon.className = "ha-nowplaying-pause-icon";
                pauseIcon.innerHTML = "⏸";
                pauseOverlay.appendChild(pauseIcon);
                artContainer.appendChild(pauseOverlay);
            }

            wrapper.appendChild(artContainer);
        }

        var info = document.createElement("div");
        info.className = "ha-nowplaying-info";

        if (title) {
            var titleDiv = document.createElement("div");
            titleDiv.className = "ha-nowplaying-title";
            if (title.length > 24) {
                titleDiv.className += " ha-nowplaying-scroll";
                var titleSpan = document.createElement("span");
                titleSpan.innerHTML = title;
                titleDiv.appendChild(titleSpan);
                // Start JavaScript scrolling
                this.startScrolling(titleDiv, titleSpan);
            } else {
                titleDiv.innerHTML = title;
            }
            info.appendChild(titleDiv);
        }

        if (artist) {
            var artistDiv = document.createElement("div");
            artistDiv.className = "ha-nowplaying-artist";
            if (artist.length > 24) {
                artistDiv.className += " ha-nowplaying-scroll";
                var artistSpan = document.createElement("span");
                artistSpan.innerHTML = artist;
                artistDiv.appendChild(artistSpan);
                // Start JavaScript scrolling
                this.startScrolling(artistDiv, artistSpan);
            } else {
                artistDiv.innerHTML = artist;
            }
            info.appendChild(artistDiv);
        }

        if (album) {
            var albumDiv = document.createElement("div");
            albumDiv.className = "ha-nowplaying-album";
            if (album.length > 24) {
                albumDiv.className += " ha-nowplaying-scroll";
                var albumSpan = document.createElement("span");
                albumSpan.innerHTML = album;
                albumDiv.appendChild(albumSpan);
                // Start JavaScript scrolling
                this.startScrolling(albumDiv, albumSpan);
            } else {
                albumDiv.innerHTML = album;
            }
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
            this.currentTimeEl = currentTimeLabel;

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
            this.progressFillEl = progressFill;
            this.totalDuration = totalDuration;
            
            progressBar.appendChild(progressFill);
            progressContainer.appendChild(progressBar);
            
            info.appendChild(progressContainer);
        }

        wrapper.appendChild(info);
        return wrapper;
    },

    updateProgress: function() {
        if (
            !this.nowPlaying ||
            this.nowPlaying.state !== 'playing' ||
            !this.nowPlaying.attributes ||
            this.nowPlaying.attributes.media_position === undefined ||
            !this.nowPlaying.attributes.media_position_updated_at ||
            !this.currentTimeEl ||
            !this.progressFillEl ||
            !this.totalDuration
        ) { return; }

        var attr = this.nowPlaying.attributes;
        var elapsed = (Date.now() - new Date(attr.media_position_updated_at).getTime()) / 1000;
        var position = Math.min(attr.media_position + elapsed, this.totalDuration);

        this.currentTimeEl.innerHTML = this.formatTime(position);
        this.progressFillEl.style.width = ((position / this.totalDuration) * 100) + "%";
    },

    // Helper function to format time in MM:SS format
    formatTime: function(seconds) {
        var minutes = Math.floor(seconds / 60);
        var remainingSeconds = Math.floor(seconds % 60);
        return minutes.toString().padStart(2, '0') + ":" + remainingSeconds.toString().padStart(2, '0');
    },

    // JavaScript-based scrolling function
    startScrolling: function(container, span) {
        // Clear any existing animation
        if (span.scrollAnimationId) {
            cancelAnimationFrame(span.scrollAnimationId);
        }
        
        var position = 0;
        var direction = -1; // -1 for left, 1 for right
        var speed = 0.5; // pixels per frame (slower for smoother movement)
        var pauseAtEnds = 1000; // milliseconds to pause at each end
        var isPaused = false;
        var pauseStartTime = 0;
        
        // Set initial position
        span.style.position = 'relative';
        span.style.left = '0px';
        span.style.transition = 'none'; // Disable CSS transitions for smooth animation
        
        function scroll() {
            var containerWidth = container.offsetWidth;
            var spanWidth = span.offsetWidth;
            
            if (spanWidth <= containerWidth) {
                return; // No need to scroll
            }
            
            var currentTime = Date.now();
            
            // Handle pausing at ends
            if (isPaused) {
                if (currentTime - pauseStartTime >= pauseAtEnds) {
                    isPaused = false;
                } else {
                    span.scrollAnimationId = requestAnimationFrame(scroll);
                    return;
                }
            }
            
            position += speed * direction;
            
            // Reverse direction when hitting edges
            if (position <= -(spanWidth - containerWidth)) {
                direction = 1; // Go right
                isPaused = true;
                pauseStartTime = currentTime;
            } else if (position >= 0) {
                direction = -1; // Go left
                isPaused = true;
                pauseStartTime = currentTime;
            }
            
            span.style.left = position + 'px';
            
            // Continue scrolling
            span.scrollAnimationId = requestAnimationFrame(scroll);
        }
        
        // Start scrolling after a delay
        setTimeout(function() {
            scroll();
        }, 2000);
    },





    //getHeader: function() {
    //    return "Now Playing";
    //},

    suspend: function() {
        clearInterval(this.timer);
        clearInterval(this.progressTimer);
        
        // Stop all scrolling animations
        var scrollingElements = document.querySelectorAll('.ha-nowplaying-scroll span');
        scrollingElements.forEach(function(span) {
            if (span.scrollAnimationId) {
                cancelAnimationFrame(span.scrollAnimationId);
                span.scrollAnimationId = null;
            }
        });
    },

    resume: function() {
        this.getData();
        this._startTimers();
    }
}); 