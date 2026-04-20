const NodeHelper = require("node_helper");
const https = require("https");
const http = require("http");

const ACTIVE_STATES = ["playing", "paused", "buffering"];

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
        this.fetchSensor(config, config.sensor, function(err, data) {
            if (!err && data && ACTIVE_STATES.includes(data.state)) {
                self.sendSocketNotification("HA_DATA_RECEIVED", data);
            } else if (config.fallbackSensor) {
                self.fetchSensor(config, config.fallbackSensor, function(err2, data2) {
                    if (!err2 && data2) {
                        self.sendSocketNotification("HA_DATA_RECEIVED", data2);
                    } else {
                        self.sendSocketNotification("HA_DATA_RECEIVED", data || null);
                    }
                });
            } else if (!err && data) {
                self.sendSocketNotification("HA_DATA_RECEIVED", data);
            } else {
                self.sendSocketNotification("HA_DATA_ERROR", err);
            }
        });
    },

    fetchSensor: function(config, sensor, callback) {
        const protocol = config.haPort === 443 ? https : http;
        const options = {
            hostname: config.haIP,
            port: config.haPort,
            path: `/api/states/${sensor}`,
            method: "GET",
            headers: { "Content-Type": "application/json" }
        };

        if (config.haToken && config.haToken.length > 0) {
            options.headers["Authorization"] = "Bearer " + config.haToken;
        }

        let done = false;
        const once = (err, data) => { if (!done) { done = true; callback(err, data); } };

        const req = protocol.request(options, function(res) {
            let data = "";
            res.on("data", function(chunk) { data += chunk; });
            res.on("end", function() {
                if (res.statusCode === 200) {
                    try {
                        once(null, JSON.parse(data));
                    } catch (e) {
                        once("Parse error: " + e.message, null);
                    }
                } else {
                    once("HTTP " + res.statusCode + ": " + data, null);
                }
            });
        });

        req.on("error", function(e) { once("Network error: " + e.message, null); });
        req.end();
    }
});
