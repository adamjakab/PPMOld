/**
 *
 * @constructor
 */
function ChromeStorage() {
    var _logzone = 'ChromeStorage';
    var storage_data_local;
    var storage_data_sync;

    /*-------------------------------------------------------------------------------------PUBLIC METHODS*/

    this.init = function(pn, mk, es, callback) {
        log("Initing...");
        storage_data_local = null;
        storage_data_sync = null;

        document.dispatchEvent(new CustomEvent("PPM", {
            detail: {type: "state_change"}, bubbles: true, cancelable: true
        }));

        //
        if (!this.isInited()) {
            var self = this;
            storage_data_local = new ChromeStorageLocal();
            storage_data_local.init();
            storage_data_sync = new ChromeStorageSync();
            storage_data_sync.init(pn, mk, es, function() {
                if(self.isInited()) {
                    log("Logged in.");
                    //chrome.browserAction.setIcon({"path":"images/paranoia_19.png"});
                    document.dispatchEvent(new CustomEvent("PPM", {
                        detail: {type: "state_change"}, bubbles: true, cancelable: true
                    }));
                    storage_data_sync.setOption("logincount", Number(storage_data_sync.getOption("logincount"))+1);
                } else {
                    log("Not logged in!");
                }
                if(callback) {callback();};
            });
        } else {
            if(callback) {callback();};
        }
    }

    this.shutdown = function(callback) {
        log("Shutting down...");
        storage_data_local.shutdown();
        storage_data_sync.shutdown(callback);
        storage_data_local = null;
        storage_data_sync = null;
        //chrome.browserAction.setIcon({"path":"images/paranoia_19_off.png"});
        document.dispatchEvent(new CustomEvent("PPM", {
            detail: {type: "state_change"}, bubbles: true, cancelable: true
        }));
    }

    /**
     * GET STORAGE DATA
     * @param location (local|sync)
     * @param key - Name of the key to get
     * @return {*}
     */
    this.getOption = function(location, key) {
        return(_getOption(location, key));
    }

    /**
     * SET STORAGE DATA
     * @param location (local|sync)
     * @param key - Name of the key to set
     * @param val - Value of the key to set
     */
    this.setOption = function(location, key, val) {
        _setOption(location, key, val);
    }


    this.isInited = function() {
        return(storage_data_local && storage_data_local.isInited() && storage_data_sync && storage_data_sync.isInited());
    }

    this.getCurrentSyncStoragePnEsMk = function() {
        return(storage_data_sync.getCurrentPnEsMk());
    }

    /**
     * change and immediately write out configuration encrypted with the new es/mk
     * @param es
     * @param mk
     * @param callback
     */
    this.setCurrentSyncStorageEsMk = function(es, mk, callback) {
        log("!!!CHANGING SYNCSTORAGE ES: " + es + " AND MK: " + mk);
        storage_data_sync.setCurrentEsMk(es,mk);
        this.forceSyncStorageDataWriteout(callback);
    }


    this.forceSyncStorageDataWriteout = function(callback) {
        storage_data_sync.forceStorageDataWriteout(callback);
    }
    /*-------------------------------------------------------------------------------------PRIVATE METHODS*/
    function _getOption(location, key) {
        var answer = null;
        if(location=="local") {
            answer = storage_data_local.getOption(key);
        } else if (location=="sync") {
            answer = storage_data_sync.getOption(key);
        }
        //log("[STORAGE]:("+location+"?"+key+"): " + answer);
        return(answer);
    }

    function _setOption(location, key, val) {
        if(location=="local") {
            storage_data_local.setOption(key, val);
        } else if (location=="sync") {
            storage_data_sync.setOption(key, val);
        }
    }

    var log = function(msg) {PPM.log(msg, _logzone)};//just for comodity
}