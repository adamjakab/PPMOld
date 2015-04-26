/**
 *
 * @constructor
 */
function PPMStorage() {
    var _logzone = 'PPMStorage';
    var servers;
    var storage;
    var queue;
    //
    var srvIntervalRef = null;
    var initialDataIndexLoaded = false;
    //
    var self = this;

    /*-------------------------------------------------------------------------------------PUBLIC METHODS*/
    this.init = function(callback) {
        log("Initing...");
        _startCheckService();
        this.registerServers();//servers will connect automatically
        if(callback) {callback();};
    }

    this.shutdown = function(callback) {
        log("Shutting down...");
        _stopCheckService();
        this.unregisterServers(callback);
    }

    this.getStorageData = function() {
        return(storage);
    }

    this.getStorageCount = function() {
        return(storage.length);
    }




    this.addNewPasscard = function(s, callback) {
        var PC = _registerPasscard(s);
        if(PC) {
            PC.save(function() {
                //this can be triggered only after save 'coz otherwise options tab will try to load it before it has been saved
                //in fact PC should be pushed onto storage array only after successful save
                document.dispatchEvent(new CustomEvent("PPM", {
                    detail: {type: "storage_change"}, bubbles: true, cancelable: true
                }));
                if (callback&&typeof callback == "function") {
                    callback();
                }
            });
            return(true);
        } else {
            return(false);
        }
    }

    this.removePasscard = function(PC) {
        var answer = _unregisterPasscard(PC);
        return(answer);
    }


    var _registerPasscard = function(s) {
        var PC = new Passcard();
        var res = PC.init(s);
        if(res) {
            storage.push(PC);
            return(PC)
        } else {
            return(false);
        }
    }

    var _unregisterPasscard = function(PC) {
        var answer = false;
        for (var i = 0; i < storage.length; i++) {
            if (storage[i] === PC) {
                storage.splice(i,1);
                document.dispatchEvent(new CustomEvent("PPM", {
                    detail: {type: "storage_change"}, bubbles: true, cancelable: true
                }));
                answer = true;
                break;
            }
        }
        return(answer);
    }


    this.getPasscardWithID = function(id) {
        return(_getPasscardWithID(id));
    }

    var _getPasscardWithID = function(id) {
        answer = false;
        for (var i = 0; i < storage.length; i++) {
            if (storage[i].get("collection") == "passcard" && storage[i].get("id") == id) {
                answer = storage[i];
                break;
            }
        }
        return(answer);
    }


    this.registerOperationInQueue = function(o) {
        _registerOperationInQueue(o);
    }
    this.getOperationQueueLength =function() {
        return(_getQueueLength());
    }
    this.getNextOperationToExecuteFromQueue = function(srvIndex) {
        return(_getNextOperationToExecuteFromQueue(srvIndex));
    }
    this.operationWasExecutedByServer = function(o, srvIndex){
        _operationWasExecutedByServer(o, srvIndex);
    }

    this.areAllServersConnected = function() {
        return(_areAllServersConnected());
    }

    this.isInitialDataIndexLoaded = function() {
        return(initialDataIndexLoaded === true);
    }

    this.isInited = function() {
        return(_areAllServersConnected() && initialDataIndexLoaded === true);
    }

    /*-------------------------------------------------------------------------------------PRIVATE METHODS*/
    var _registerOperationInQueue = function(o) {
        /*
         * the parameter will hold: {"ppmObj": the object to execute operation on, "operation": "save/delete", "callback": callback};
         */
        //adding array for holding data about which server has already executed operation on this object
        o.executedByServer = new Array();

        queue.push(o);
        log("queued operation for["+ o.ppmObj.get("collection")+"]{"+ o.operation+"}: " + o.ppmObj.get("name"));
    }

    var _getNextOperationToExecuteFromQueue = function(srvIndex) {
        var answer = false;
        var queueLength = _getQueueLength();
        if(queueLength) {
            for(var i = 0; i < queueLength; i++) {
                if(queue[i] && queue[i].executedByServer && !queue[i].executedByServer[srvIndex]) {
                    answer = queue[i];
                    break;
                }
            }
        }
        return(answer);
    }

    var _operationWasExecutedByServer = function(o, srvIndex) {
        o.executedByServer[srvIndex] = true;
        //check if all servers have done their job
        if(true) {
            //remove from queue
            var queueLength = _getQueueLength();
            for(var i = 0; i < queueLength; i++) {
                if(queue[i] === o) {
                    queue.splice(i,1);
                    break;
                }
            }
        }
        log("Operation for["+ o.ppmObj.get("collection")+"] was executed by all servers - remaining queue length: " + _getQueueLength());
        //calling original callback
        if (o.callback && typeof o.callback == "function") {
            o.callback();
        }
    }


    var _getQueueLength = function() {
        return(queue.length);
    }


    this.registerServers = function() {
        servers = new Array();
        queue = new Array();
        log("Registering Paranoia Servers...");
        var srvIndex = 0;
        var srv, srvchk;
        while(srvIndex<1) {/*while(true) {*/
            srv = new ParanoiaServer();
            srvchk = srv.init(srvIndex);
            if (!srvchk) {
                break;
            } else {
                servers[srvIndex] = srv;
            }
            srvIndex++;
        }
        //
        var srvCnt = _getNumberOfRegisteredServers();
        if (srvCnt == 0) {
            log("There are no servers configured.");
        } else {
            log("Registered "+srvCnt+" servers successfully.");
        }
    }

    /**
     * stops and disconnects servers
     *
     * @param callback
     */
    this.unregisterServers = function(callback) {
        var srvIndex = 0;
        var srvCnt = _getNumberOfRegisteredServers();
        log("Unregistering Paranoia Servers("+srvCnt+")...");
        if(srvCnt > 0) {
            while(srvIndex<srvCnt) {
                var srv = servers[srvIndex];
                srv.shutdown(function() {
                    if (_getNumberOfConnectedServers() == 0) {
                        if(callback) {callback();};
                    }
                });
                srvIndex++;
            }
        } else {
            log("No servers to unregister.");
            if(callback) {callback();};
        }
    }

    this.reconnectAllServersAfterConfigChange = function(callback) {
        var self = this;
        self.unregisterServers(function() {
            self.registerServers();
            var maxWITime = 5 * 1000;//5 seconds
            var curWITime = 0;
            var wIinterval = 250;
            var wI = setInterval(function() {
                var allServersConnected = self.areAllServersConnected();
                if(allServersConnected || curWITime>maxWITime) {
                    //we have all servers reconnected OR TIMED OUT
                    clearInterval(wI);
                    log(allServersConnected?"ALL SERVERS HAVE BEEN RECONNECTED!":"SERVER RECONNECTION TIMEOUT!");
                    if (callback && typeof callback == "function") {
                        callback(allServersConnected);
                    }
                }
                curWITime += wIinterval;
            }, wIinterval);
        });
    }

    /**
     * load secure && params for all passcards - normally this will be fired ONLY when server configuration has been changed
     * which requires re-saving of all passcards.
     * @param callback
     * @param statsCallback
     */
    this.fullyLoadAllPasscards = function(callback, statsCallback) {
        if(!fullyLoadAllPasscardsCheck(callback, statsCallback)) {
            log("Fully reloading passcards #" + storage.length);
            var SD;
            for(var i=0; i<storage.length; i++) {
                SD = storage[i];
                if(!SD.hasParams()) {
                    SD.loadParams(function() {
                        fullyLoadAllPasscardsCheck(callback, statsCallback);
                    });
                }
                if(!SD.hasSecure()) {
                    SD.loadSecure(function() {
                        fullyLoadAllPasscardsCheck(callback, statsCallback);
                    });
                }
            }
        }
    }

    var fullyLoadAllPasscardsCheck = function(callback, statsCallback) {
        if(storage && storage.length>0) {
            var max = storage.length;
            var cntP = 0;
            var cntS = 0;
            for(var i=0; i<max; i++) {
                cntP += (storage[i].hasParams()?1:0);
                cntS += (storage[i].hasSecure()?1:0);
            }
            log("PC_FULLOAD_STATE: P:" + cntP + " S:" + cntS + " MAX: " + max);

            if (statsCallback && typeof statsCallback == "function") {
                var stats = {"PCLOAD_PARAM_PREC" : (Math.round(100*(cntP/max))), "PCLOAD_SECURE_PREC" : (Math.round(100*(cntS/max)))};
                statsCallback(stats);
            }
        }

        if (!storage || storage.length==0 || (cntP == max && cntS == max)) {
            if (callback && typeof callback == "function") {
                callback();
            }
            return(true);
        } else {
            return(false);
        }
    }

    /**
     * resave all passcards to db
     * @param callback
     * @param statsCallback - callback during elaboration to show current state - must have param#0 {SSCNT:0}
     */
    this.resaveAllPasscards = function(callback, statsCallback) {
        log("Re-saving all passcards #" + storage.length);
        var SD;
        for(var i=0; i<storage.length; i++) {
            SD = storage[i];
            SD.save(function() {
                resaveAllPasscardsCheck(callback, statsCallback);
            });
        }
    }

    var resaveAllPasscardsCheck = function(callback, statsCallback) {
        if(storage && storage.length>0) {
            var maxCnt = storage.length;
            var unprocessedCnt = 0;
            for(var i=0; i<maxCnt; i++) {
                unprocessedCnt += (storage[i].getState()==1?1:0);
            }
            log("PC_RESAVE_ALL_STATE: Unprocessed:" + unprocessedCnt + " MAX: " + maxCnt);

            if (statsCallback && typeof statsCallback == "function") {
                var stats = {"PCSAVE_PREC" : (Math.round(100*((maxCnt-unprocessedCnt)/maxCnt)))};
                statsCallback(stats);
            }
        }

        if (!storage || storage.length==0 || unprocessedCnt == 0) {
            if (callback && typeof callback == "function") {
                callback();
            }
            return(true);
        } else {
            return(false);
        }
    }




    /*
    this.resaveAllPasscards = function(callback, statsCallback) {
        if (!self.resaveAllPasscardsInited) {
            self.resaveAllPasscardsInited = true;
            self.resaveAllPasscardsCallback = callback;
            self.lastSavedPasscardIndex = 0;
        }
        if(self.lastSavedPasscardIndex >= storage.length) {
            //finished
            var callback = self.resaveAllPasscardsCallback;
            delete self.resaveAllPasscardsInited;
            delete self.lastSavedPasscardIndex;
            delete self.resaveAllPasscardsCallback;
            if (callback && typeof callback == "function") {
                callback();
            }
        } else {
            log("saving passcard #"+self.lastSavedPasscardIndex+"/"+storage.length);
            if (statsCallback && typeof statsCallback == "function") {
                statsCallback(self.lastSavedPasscardIndex);
            }
            var PC = storage[self.lastSavedPasscardIndex];
            self.lastSavedPasscardIndex++;
            PC.save(self.resaveAllPasscards);
        }
    }
    */




    var _getInitialDataIndex = function() {
        log("getting Initial Data Index");
        storage = new Array();
        var srvIndex = 0;
        var srv;
        while(srvIndex<1) {
            srv = servers[srvIndex];
            srv.loadDataIndex(_getInitialDataIndexDone);
            srvIndex++;
        }
    }

    var _getInitialDataIndexDone = function(success, indexData) {
        log("Data Index Loaded("+(success?"OK":"FAILED")+")");
        if(success && typeof indexData == "object" && indexData instanceof Array) {
            initialDataIndexLoaded = true;
            log("Number of items loaded: " + indexData.length);
            for (var i in indexData) {
                _registerPasscard(indexData[i]);
            }
            //register listener for Win/Tab url changes
            PPM.registerWinTabFocusListener();
        } else {
            initialDataIndexLoaded = false;
        }
        document.dispatchEvent(new CustomEvent("PPM", {
            detail: {type: "state_change"}, bubbles: true, cancelable: true
        }));
    }



    function _getNumberOfConnectedServers() {
        var connCnt = 0;
        var srvCnt = _getNumberOfRegisteredServers();
        var srvIndex = 0;
        while(srvIndex<srvCnt) {
            connCnt += (servers[srvIndex].isConnected()?1:0);
            srvIndex++;
        }
        return(connCnt);
    }

    function _getNumberOfRegisteredServers() {
        return(servers.length);
    }

    var _areAllServersConnected = function() {
        return (_getNumberOfRegisteredServers() > 0 && (_getNumberOfConnectedServers() == _getNumberOfRegisteredServers()));
    }



    var _checkService = function() {
        //check if we need to load initial payload
        if(initialDataIndexLoaded === false) {
            if(_areAllServersConnected()) {
                initialDataIndexLoaded = "loading";
                _getInitialDataIndex();
            }
        }
    }

    var _startCheckService = function() {
        if(srvIntervalRef == null) {
            srvIntervalRef = setInterval(_checkService, 1000);
        }
    }

    var _stopCheckService = function() {
        clearInterval(srvIntervalRef);
        srvIntervalRef = null;
    }

    var log = function(msg) {PPM.log(msg, _logzone)};//just for comodity
}
