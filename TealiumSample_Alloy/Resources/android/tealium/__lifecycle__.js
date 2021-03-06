function Tealium$Lifecycle(cache) {
    var created = false;
    var timeoutId = 0/0;
    var VER = Titanium.App.version || "?";
    var DAY_IN_MS = 864e5;
    var TIMEOUT = 1e4;
    var countLaunches = "countLaunches:" + VER;
    var countSleeps = "countSleeps:" + VER;
    var countWakes = "countWakes:" + VER;
    var countTerminations = "countTerminations" + VER;
    var state = {
        tsFirstLaunch: 0,
        tsLastResume: 0,
        tsLastPause: 0,
        tsLastWake: 0,
        tsLastUpdate: 0,
        totWakeSeconds: 0,
        totWakeSecondsSinceLastLaunch: 0,
        countTotLaunches: 0,
        countTotWakes: 0,
        countTotTerminations: 0,
        countTotSleeps: 0,
        initial: 0,
        launch: 0,
        wake: 0,
        sleep: 0,
        crash: 0,
        terminate: 0
    };
    state[countLaunches] = 0;
    state[countSleeps] = 0;
    state[countWakes] = 0;
    state[countTerminations] = 0;
    var calls = {};
    (function() {
        var loaded = cache.loadLifecycleValues();
        for (var key in loaded) state[key] = loaded[key];
        var call = {
            getData: function(date, state) {
                var ts = date.getTime();
                var data = {};
                data[Tealium.Key.LINK_ID] = "lifecycle";
                data[Tealium.Key.TEALIUM_ID] = "LIFE";
                data[Tealium.Key.LIFECYCLE_DAYOFWEEK_LOCAL] = date.getDay();
                data[Tealium.Key.LIFECYCLE_HOUROFDAY_LOCAL] = date.getHours();
                data[Tealium.Key.LIFECYCLE_DAYSSINCELASTWAKE] = 0 == state.tsLastWake ? 0 : Math.floor((ts - state.tsLastWake) / DAY_IN_MS);
                if ("undefined" != (typeof this["addAdditionalDataSources"]).toLowerCase() && "undefined" != (typeof this["eventName"]).toLowerCase()) {
                    this.addAdditionalDataSources(date, data, state);
                    data[Tealium.Key.LIFECYCLE_DAYSSINCELAUNCH] = Math.floor((ts - state.tsFirstLaunch) / DAY_IN_MS);
                    var dateFirstLaunch = new Date(state.tsFirstLaunch);
                    data[Tealium.Key.LIFECYCLE_FIRSTLAUNCHDATE] = Tealium.Util.formatAsISO8601(dateFirstLaunch);
                    data[Tealium.Key.LIFECYCLE_FIRSTLAUNCHDATE_MMDDYYYY] = Tealium.Util.formatAsMMDDYYYY(dateFirstLaunch);
                    if (state.tsLastUpdate > 0) {
                        data[Tealium.Key.LIFECYCLE_DAYSSINCEUPDATE] = Math.floor((ts - state.tsLastUpdate) / DAY_IN_MS);
                        data[Tealium.Key.LIFECYCLE_LAUNCHCOUNT_UPDATE] = state[countLaunches];
                    }
                    data[Tealium.Key.LIFECYCLE_LAUNCHCOUNT] = state[countLaunches];
                    data[Tealium.Key.LIFECYCLE_TERMINATECOUNT] = state[countTerminations];
                    data[Tealium.Key.LIFECYCLE_WAKECOUNT] = state[countWakes];
                    data[Tealium.Key.LIFECYCLE_SLEEPCOUNT] = state[countSleeps];
                    data[Tealium.Key.LIFECYCLE_TOTALLAUNCHCOUNT] = state.countTotLaunches;
                    data[Tealium.Key.LIFECYCLE_TOTALTERMINATECOUNT] = state.countTotTerminations;
                    data[Tealium.Key.LIFECYCLE_TOTALWAKECOUNT] = state.countTotWakes;
                    data[Tealium.Key.LIFECYCLE_TOTALSLEEPCOUNT] = state.countTotSleeps;
                    data[Tealium.Key.LIFECYCLE_TOTALSECONDSAWAKE] = state.totWakeSeconds;
                    data[Tealium.Key.LIFECYCLE_TYPE] = this.eventName;
                    var key = "lastSimilarCall:" + this.eventName;
                    key in state && state[key] > 0 && (data[Tealium.Key.LIFECYCLE_LASTSIMILARCALLDATE] = Tealium.Util.formatAsISO8601(new Date(state[key])));
                    state[key] = date.getTime();
                }
                cache.storeLifecycleValues(state);
                return data;
            }
        };
        var wakeCall = Object.create(call);
        wakeCall.addAdditionalDataSources = function(date, data, state) {
            state.tsLastWake = date.getTime();
            state[countWakes]++;
            state.countTotWakes++;
            var yearOffset = 1e4 * date.getUTCFullYear();
            var currentDay = yearOffset + 100 * date.getUTCMonth() + date.getDate();
            var currentMonth = date.getMonth() + yearOffset;
            if (state.dayLastWake != currentDay) {
                state.dayLastWake = currentDay;
                data[Tealium.Key.LIFECYCLE_ISFIRSTWAKETODAY] = true;
            }
            if (state.monthLastWake != currentMonth) {
                state.monthLastWake = currentMonth;
                data[Tealium.Key.LIFECYCLE_ISFIRSTWAKEMONTH] = true;
            }
        };
        var sleepCall = Object.create(call);
        sleepCall.addAdditionalDataSources = function(date, data, state) {
            var secondsAwake = Math.round((date.getTime() - state.tsLastWake) / 1e3);
            state.totWakeSeconds += secondsAwake;
            data[Tealium.Key.LIFECYCLE_TOTALSECONDSAWAKE] = state.totWakeSeconds;
            data[Tealium.Key.LIFECYCLE_SECONDSAWAKE] = secondsAwake;
            state.totWakeSecondsSinceLastLaunch += secondsAwake;
        };
        calls.createCall = Object.create(wakeCall);
        calls.createCall.addAdditionalDataSources = function(date, data, state) {
            wakeCall.addAdditionalDataSources(date, data, state);
            state[countLaunches]++;
            state.countTotLaunches++;
            if (0 == state.tsFirstLaunch) {
                date[Tealium.Key.LIFECYCLE_ISFIRSTLAUNCH] = true;
                state.tsFirstLaunch = date.getTime();
                calls.createCall.eventName = "initial";
            } else {
                calls.createCall.eventName = "launch";
                data[Tealium.Key.LIFECYCLE_PRIORSECONDSAWAKE] = state.totWakeSecondsSinceLastLaunch;
                state.totWakeSecondsSinceLastLaunch = 0;
            }
            if ("undefined" == (typeof state.version).toLowerCase()) state.version = Titanium.App.version || "?"; else if (state.version != Titanium.App.version || "?") {
                state.version = Titanium.App.version;
                state.tsLastUpdate = date.getTime();
                data[Tealium.Key.LIFECYCLE_ISFIRSTLAUNCHUPDATE] = "true";
            }
        };
        calls.createCall.eventName = "initial";
        calls.resumeCall = Object.create(wakeCall);
        calls.resumeCall.eventName = "wake";
        calls.crashCall = Object.create(call);
        calls.crashCall.addAdditionalDataSources = function() {};
        calls.crashCall.eventName = "crash";
        calls.pauseCall = Object.create(sleepCall);
        calls.pauseCall.addAdditionalDataSources = function(date, data, state) {
            sleepCall.addAdditionalDataSources(date, data, state);
            state[countSleeps]++;
            state.countTotSleeps++;
        };
        calls.pauseCall.eventName = "sleep";
        calls.terminateCall = Object.create(sleepCall);
        calls.terminateCall.addAdditionalDataSources = function(date, data, state) {
            sleepCall.addAdditionalDataSources(date, data, state);
            state[countTerminations]++;
            state.countTotTerminations++;
        };
        calls.terminateCall.eventName = "terminate";
    })();
    var tsLastResume = 0;
    var tsLastPause = 0;
    this.onFocus = function() {
        tsLastResume = new Date().getTime();
        if (!isNaN(timeoutId)) {
            clearTimeout(timeoutId);
            timeoutId = 0/0;
        }
        if (tsLastResume - tsLastPause > TIMEOUT) {
            var lastSleep = cache.popLifecycleLastSleep();
            lastSleep > 0 && Tealium.trackCustomEvent("link", calls.terminateCall.getData(new Date(lastSleep), state));
            if (created) Tealium.trackCustomEvent("link", calls.resumeCall.getData(new Date(), state)); else {
                created = true;
                Tealium.trackCustomEvent("link", calls.createCall.getData(new Date(), state));
            }
        }
    };
    this.onBlur = function() {
        if (!isNaN(timeoutId)) {
            clearTimeout(timeoutId);
            timeoutId = 0/0;
        }
        tsLastPause = new Date().getTime();
        cache.onLifecycleSleep(tsLastPause);
        timeoutId = setTimeout(function() {
            if (tsLastPause > tsLastResume) {
                cache.popLifecycleLastSleep();
                Tealium.trackCustomEvent("link", calls.pauseCall.getData(new Date(tsLastPause), state));
            }
        }, TIMEOUT);
    };
}

"undefined" == typeof Tealium$Lifecycle;