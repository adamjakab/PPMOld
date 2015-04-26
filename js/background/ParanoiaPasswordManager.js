function ParanoiaPasswordManager() {
    var _do_console_logging = true;
    var _logPrefix = "PPM";
    var _logzone = 'Main';
    var UTILS;
    var CRYPTER;
    var CHROMESTORAGE;
    var PPMSTORAGE;
    var GATRACKER;
    //@TODO: AUTOLOGIN!!! - remove this!!!
    var _DO_AUTOLOGIN_ = false;
    //

    /*-------------------------------------------------------------------------------------PUBLIC METHODS*/
    this.getUtils=function(){return(UTILS);}
    this.getCrypter=function(){return(CRYPTER);}
    this.getChromeStorage=function(){return(CHROMESTORAGE);}
    this.getPPMStorage=function(){return(PPMSTORAGE);}


    //------------------------------------------------------------------------------------------------------
    /**
     * MAIN BACKGROUND SCRIPT INIT/LOGIN SEQUENCE
     * @param pn
     * @param mk
     * @param es
     * @param login_callback
     */
    this.init = function(pn, mk, es, login_callback) {
        log("INIT PHASE 0" + (pn&&mk&&es?" - [logging into profile: "+pn+"]":"") + "...", _logzone);
        //CREATE AND INITIALIZE UTILS
        if(!(UTILS || UTILS instanceof PPMUtils)) {
            UTILS = new PPMUtils();//PPMUtils.js
            UTILS.init();
        }
        //CREATE AND INITIALIZE CRYPTER
        if(!(CRYPTER || CRYPTER instanceof PPMCrypter)) {
            CRYPTER = new PPMCrypter();//PPMCrypter.js
            CRYPTER.init();
        }
        //CREATE AND INITIALIZE GA TRACKING CODE
        if(!(GATRACKER || GATRACKER instanceof GoogleAnalytics)) {
            GATRACKER = new GoogleAnalytics();//GoogleAnalytics.js
            GATRACKER.init();
        }

        CHROMESTORAGE = new ChromeStorage();//ChromeStorage.js
        CHROMESTORAGE.init(pn, mk, es, function() {
            if(login_callback && typeof login_callback == "function") {
                login_callback(CHROMESTORAGE.isInited());//tell login form the outcome of the login
            }
            //continue anyways independently of the login result
            PPM_init_phase_1();
        });
    }

    function PPM_init_phase_1() {
        log("INIT PHASE 1...", _logzone);
        if(CHROMESTORAGE.isInited()) {
            PPMSTORAGE = new PPMStorage();//PPMStorage.js
            PPMSTORAGE.init(PPM_init_phase_2);
        } else {
            PPM_init_phase_2();
        }
    }

    function PPM_init_phase_2() {
        log("INIT PHASE 2...", _logzone);

        document.dispatchEvent(new CustomEvent("PPM", {
            detail: {type: "test", msg:"ciao"},
            bubbles: true,
            cancelable: true
        }));


        //@TODO: AUTOLOGIN!!! - remove this!!!
        //---------------------------------------------------------------------------------
        if (_DO_AUTOLOGIN_) {
            if(!CHROMESTORAGE.isInited()) {
                log("PHASE 2/TRYING AUTOLOGIN TO PROFILE(PPMCONFIG)...", _logzone);
                PPM.init("PPMCONFIG", "Paranoia", "PPM_ENCRYPTION_SCHEME_AESMD5", function() {
                    log("PHASE 2/AUTOLOGIN: DONE!", _logzone);
                });
            }
        }
        //----------------------------------------------------------------------------------
    }


    //------------------------------------------------------------------------------------------------------
    /**
     * MAIN BACKGROUND SCRIPT SHUTDOWN/LOGOUT SEQUENCE
     */
    this.shutdown = function() {
        log("SHUTDOWN PHASE 0...", _logzone);
        this.unregisterWinTabFocusListener();
        if(CHROMESTORAGE.isInited()) {
            PPMSTORAGE.shutdown(PPM_shutdown_phase_1);
        } else {
            PPM_shutdown_phase_1();
        }
    }

    function PPM_shutdown_phase_1() {
        log("SHUTDOWN PHASE 1...", _logzone);
        CHROMESTORAGE.shutdown(function() {
            PPM.init();
        });
    }

    //------------------------------------------------------------------------------PPM Custom Event Listener
    var PpmCustomEventListener = function(e) {
        if(e && e.detail && e.detail.type) {
            var d = e.detail;
            log("CEL["+d.type+"] -> " + JSON.stringify(d), _logzone);
            switch (d.type) {
                case "test":
                    //;) testing
                    break;
                case "state_change":
                    UTILS.setStateIcon();
                    break;
                case "storage_change":
                    UTILS.handleStorageChangeEvent();
                    break;
                default:
                    log("customEventListener - Event type is unknown: " + d.type, _logzone);
            }
        } else {
            log("customEventListener - Event type is not defined!", _logzone);
        }
    }
    //
    document.addEventListener("PPM", PpmCustomEventListener, false);
    /*
        //DISPATCH CUSTOM EVENT LIKE THIS:
         document.dispatchEvent(new CustomEvent("PPM", {
             detail: {type: "test", msg:"ciao"},
             bubbles: true,
             cancelable: true
         }));
    */

    //------------------------------------------------------------------------------WIN/TAB related listeners
    /*CALLED BY PPMStorage when all initial data is loaded
     and ready to be used @_getInitialDataIndexDone */
    this.registerWinTabFocusListener = function() {
        log("Registering Win/Tab Listeners.");
        if(!chrome.windows.onFocusChanged.hasListener(UTILS.windowFocusListener)) {
            chrome.windows.onFocusChanged.addListener(UTILS.windowFocusListener);
            //execute it right away for the first time so that passcard count on current tab will be updated
            UTILS.windowFocusListener(chrome.windows.WINDOW_ID_CURRENT);
        }
        if(!chrome.tabs.onActivated.hasListener(UTILS.tabFocusListener)) {
            chrome.tabs.onActivated.addListener(UTILS.tabFocusListener);
        }
        if(!chrome.tabs.onUpdated.hasListener(UTILS.tabUpdateListener)) {
            chrome.tabs.onUpdated.addListener(UTILS.tabUpdateListener);
        }
    }

    this.unregisterWinTabFocusListener = function() {
        if(chrome.windows.onFocusChanged.hasListener(UTILS.windowFocusListener)) {
            chrome.windows.onFocusChanged.removeListener(UTILS.windowFocusListener);
        }
        if(chrome.tabs.onActivated.hasListener(UTILS.tabFocusListener)) {
            chrome.tabs.onActivated.removeListener(UTILS.tabFocusListener);
        }
        if(chrome.tabs.onUpdated.hasListener(UTILS.tabUpdateListener)) {
            chrome.tabs.onUpdated.removeListener(UTILS.tabUpdateListener);
        }
    }


    /**
     *
     * @param targetName
     * @param eventName
     * @constructor
     */
    this.GATrackEvent = function(targetName, eventName) {
        GATRACKER.trackEvent(targetName, eventName);
    }

    /**
     * Main Logging Interface
     * @param msg
     * @param zone
     */
    this.log = function(msg, zone){log(msg, zone);}
    var log = function(msg, zone) {
        if (_do_console_logging) {
            var ts = Date.now();
            var prefix = _logPrefix + "[" + ts + "]";
            if (typeof(zone) != "undefined") {
                prefix += "/" + zone;
            }
            prefix += ": ";
            console.log(prefix + msg);
        }
    }
}


//Run
var PPM;
document.addEventListener('DOMContentLoaded', function () {
    PPM = new ParanoiaPasswordManager();
    PPM.init(null, null, null, null);
});


//------------------------------------GENERAL UTILS
function PPMConfirm(q) {
    return(confirm(q));
}
function PPMAlert(m) {
    alert(m);
}




//OMNIBOX
chrome.omnibox.onInputEntered.addListener(function(cmd) {
    switch(cmd){
        //TODO: this should be allowed only when authenticated
        case "killallstorage":
            if(confirm("Are you sure to kill all local and sync storage?\nAll your configuration will be lost and default settings will be applied!")) {
                chrome.storage.local.clear();
                chrome.storage.sync.clear();
                alert("All storage areas have been cleared!");
                PPM.init();
            }
            break;
        default:
            alert('PPM - I do not understand the command: "' + cmd + '"');
            break;
    }

});

