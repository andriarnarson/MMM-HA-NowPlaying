const NodeHelper = require("node_helper");
const https = require("https");
const http = require("http");

module.exports = NodeHelper.create({
    start: function() {
        console.log("MMM-HA-NowPlaying node_helper started");
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "GET_HA_DATA") {
            this.getHomeAssistantData(payload);
        }
    },

    getHomeAssistantData: function(config) {
        const self = this;
        const protocol = config.haPort === 443 ? https : http;
        const url = `${config.haIP}:${config.haPort}/api/states/${config.sensor}`;
        
        const options = {
            hostname: config.haIP,
            port: config.haPort,
            path: `/api/states/${config.sensor}`,
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        };

        if (config.haToken && config.haToken.length > 0) {
            options.headers["Authorization"] = "Bearer " + config.haToken;
        }

        const req = protocol.request(options, function(res) {
            let data = "";
            res.on("data", function(chunk) {
                data += chunk;
            });
            
            res.on("end", function() {
                if (res.statusCode === 200) {
                    try {
                        const jsonData = JSON.parse(data);
                        self.sendSocketNotification("HA_DATA_RECEIVED", jsonData);
                    } catch (e) {
                        console.error("MMM-HA-NowPlaying: Error parsing response:", e);
                        self.sendSocketNotification("HA_DATA_ERROR", "Parse error: " + e.message);
                    }
                } else {
                    console.error("MMM-HA-NowPlaying: HTTP error:", res.statusCode, data);
                    self.sendSocketNotification("HA_DATA_ERROR", "HTTP " + res.statusCode + ": " + data);
                }
            });
        });

        req.on("error", function(e) {
            console.error("MMM-HA-NowPlaying: Request error:", e.message);
            self.sendSocketNotification("HA_DATA_ERROR", "Network error: " + e.message);
        });

        req.end();
    }
}); 