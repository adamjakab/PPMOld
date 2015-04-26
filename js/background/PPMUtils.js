function PPMUtils() {
    var _logzone = 'PPMUtils';
    var self = this;
    var tabContentScriptStates = [];
    var currentTab = null;

    this.init = function() {
        log("Initing...");
    }


    this.windowFocusListener = function(wId) {
        //log("WCH: " + wId);
        chrome.tabs.query({windowId: wId, active: true}, function(tabs) {
            var t = tabs.pop();
            if(t) {
                self.tabFocusListener({windowId: wId, tabId: t.id});
            }
        });
    }

    this.tabFocusListener = function(aInfo) {
        _checkPasscardAvailabilityForTab(aInfo.tabId);
    }

    this.tabUpdateListener = function(tId, changeInfo) {
        tabContentScriptStates[tId] = false;
        if(changeInfo.status == "complete") {
            //log("TabCntUpdated!" + JSON.stringify(changeInfo));
            _checkPasscardAvailabilityForTab(tId);
        } else {
            //reset counter to zero
            currentTab.passcards = [];
            chrome.browserAction.setBadgeText({"text": ""});
            //log("Tab status has changed to:  " + changeInfo.status);
        }
    }

    var _checkPasscardAvailabilityForTab = function(tId){
        chrome.tabs.get(tId, function(cT) {
            currentTab = cT;
            currentTab.passcards = [];
            var protocolRegExp = new RegExp('(http|https):\/\/', '');
            if(protocolRegExp.test(currentTab.url)) {
                //log("WinTabChange: " + currentTab.id + "/" + currentTab.windowId+" - url: " + currentTab.url);

                var PPMSTORAGE = PPM.getPPMStorage();
                var storageData = PPMSTORAGE.getStorageData();
                if(storageData.length > 0) {
                    for(var i=0; i<storageData.length; i++) {
                        if (_check_if_hrefs_match(storageData[i].get("identifier"), currentTab.url)) {
                            currentTab.passcards.push(storageData[i]);
                        }
                    }
                }
                chrome.browserAction.setBadgeText({"text": ""+(currentTab.passcards.length>0?currentTab.passcards.length:"")});
                //load content script
                if(currentTab.passcards.length > 0) {
                    _injectContentScriptIntoTab(currentTab);
                }
            } else {
                //it must be some chrome* tab
                log("Tab was ignored for Passcard check because of protocol in url: " + currentTab.url);
                currentTab.passcards = [];
                chrome.browserAction.setBadgeText({"text": ""});
            }
        });
    }

    /**
     * ONLY for http/https protocols
     * OK: frames/Iframes work - sometimes page must be updated ++times because here we don't know loaded status of inner frame contents
     *      - so we might be injecting script into half-loaded content -> and so content script doesn't work
     * TODO: on closing tabs we should remove them from tabContentScriptStates array
     * @param tab
     * @private
     */
    var _injectContentScriptIntoTab = function(tab) {
        if(!tabContentScriptStates[tab.id]) {
            var protocolRegExp = new RegExp('(http|https):\/\/', '');
            if(protocolRegExp.test(tab.url)) {
                chrome.tabs.executeScript(tab.id, {file: "js/vendors/jquery-1.9.1.min.js", allFrames: true}, function() {
                    chrome.tabs.executeScript(tab.id, {file: "js/content/content.js", allFrames: true}, function(resArr) {
                        log("Content Script was injected into tab #" + tab.id + "RA: " + JSON.stringify(resArr));
                        tabContentScriptStates[tab.id] = true;
                    });
                });
            } else {
                log("Content Script is not allowed in tab #" + tab.id + " - url: " + tab.url);
            }
        } else {
            //log("Content Script is already loaded in tab #" + tab.id);
        }
    }



    this.getCurrentTab = function() {
        return(currentTab);
    }

    this.getPasscardsForCurrentTab = function() {
        return((currentTab&&currentTab.passcards?currentTab.passcards:[]));
    }

    /**
     * TODO: we need to find another way to identify this tab TITLE is no good ;)
     */
    this.findAndCloseConfigurationTab = function(callback) {
        chrome.tabs.query({title:"PPM Configuration"}, function(tabs) {
            if (tabs.length) {
                var tab = tabs[0];
                chrome.tabs.remove(tab.id, callback);
            } else {
                if(callback) {callback();};
            }
        });
    }

    /**
     *
     * @param Phref Passcard identifier HREF/REGEXP
     * @param Bhref Browser href string
     * @returns {boolean}
     * @private
     */
    var _check_if_hrefs_match = function (Phref, Bhref) {
        try {
            if (Phref == "") {
                return (false);
            }//we don't want match on urlcards with NO url
            var RE = new RegExp(Phref, '');
            return (RE.test(Bhref));
        } catch (e) {
            log("_check_if_hrefs_match error: " + e + ": " + Phref);
            return(false);
        }
    }


    /**
     * Will check states of paranoia main components and server states and set browser icon accordingly
     */
    this.setStateIcon = function() {
        //chrome.browserAction.setIcon({"path":"images/paranoia_19_off.png"});
        var iconpath = "images/state_icons/offline.png";
        var CHROMESTORAGE = PPM.getChromeStorage();
        var PPMSTORAGE = PPM.getPPMStorage();
        if(CHROMESTORAGE && CHROMESTORAGE.isInited()) {
            iconpath = "images/state_icons/initing.png";
            if(PPMSTORAGE && PPMSTORAGE.isInited()) {
                iconpath = "images/state_icons/ready.png";
            } else if (PPMSTORAGE && PPMSTORAGE.isInitialDataIndexLoaded() && !PPMSTORAGE.areAllServersConnected()) {
                //server has disconnected!!! ERROR!
                iconpath = "images/state_icons/error.png";
            }
        } else {
            chrome.browserAction.setBadgeText({"text": ""});
        }
        chrome.browserAction.setIcon({"path":iconpath});
    }

    this.handleStorageChangeEvent = function() {
        //TELL OPTIONS VIEW ABOUT STORAGE CHANGE
        var optionsView = this.getExtensionViewReference("options");
        if(optionsView) {
            log("StorageChangeHandler...OPTIONS");
            optionsView.OPP.handleStorageChanges();
        }
        //TELL WIN/TAB LISTENERS ABOUT THE CHANGE (for updating count)
        this.windowFocusListener(chrome.windows.WINDOW_ID_CURRENT);

    }

    /**
     *
     * @param viewName String - the name of the view withouth the .html extension === background|options
     */
    this.getExtensionViewReference = function(viewName) {
        var answer = false;
        var viewUrl = chrome.extension.getURL(viewName+'.html');
        var views = chrome.extension.getViews();
        for (var i = 0; i < views.length; i++) {
            //log(i+" + checking: " + views[i].location.href);
            if (views[i].location.href == viewUrl) {
                //log("FOUND");
                answer = views[i];
                break;
            }
        }
        return(answer);
    }


    /**
     * Password Generator - I think we can do better than this ... but for now is ok
     * @return {String}
     */
    this.generatePassword = function() {
        var CHROMESTORAGE = PPM.getChromeStorage();
        var pwlen = CHROMESTORAGE.getOption("sync", "pwgen_length");
        var cs_alpha_lower = "abcdefghijklmnopqrstuvwxyz";
        var cs_alpha_upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var cs_numeric = "0123456789";
        var cs_special = CHROMESTORAGE.getOption("sync", "pwgen_specialchars");
        var charset = ""
            + (CHROMESTORAGE.getOption("sync", "pwgen_use_alpha_lower")?cs_alpha_lower:"")
            + (CHROMESTORAGE.getOption("sync", "pwgen_use_alpha_upper")?cs_alpha_upper:"")
            + (CHROMESTORAGE.getOption("sync", "pwgen_use_numeric")?cs_numeric:"")
            + (CHROMESTORAGE.getOption("sync", "pwgen_use_special")?cs_special:"");
        //
        var pw = "";
        for (var i = 0; i < pwlen; i++) {
            pw += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return(pw);
    }

    /* DON'T WE NEED THEESE?: "clipboardRead", "clipboardWrite"*/
    this.copyTextToClipboard = function(text) {
        var copyDiv = document.createElement('div');
        copyDiv.contentEditable = true;
        document.body.appendChild(copyDiv);
        //copyDiv.innerHTML = text;
        copyDiv.innerText = text;
        copyDiv.unselectable = "off";
        copyDiv.focus();
        document.execCommand('SelectAll');
        document.execCommand("Copy", false, null);
        document.body.removeChild(copyDiv);
    }

    this.getHumanReadableDate = function(unixTS) {
        var answer = '';
        var ts = 1000 * parseInt(unixTS);
        var jsDate = new Date(ts);
        if(jsDate && jsDate instanceof Date) {
            answer = '' +
                jsDate.getFullYear() +
                '-' +
                (jsDate.getMonth()+1) +
                '-' +
                jsDate.getDate() +
                ' ' +
                jsDate.getHours() +
                ':' +
                jsDate.getMinutes() +
                '';
        }
        return(answer);
    }


    var log = function(msg) {PPM.log(msg, _logzone)};//just for comodity
}