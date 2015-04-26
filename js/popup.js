function PopupPanel() {
    var _logzone = 'POPUP';
    var _BG_ = chrome.extension.getBackgroundPage();
    var PPM = _BG_.PPM;
    var CHROMESTORAGE = PPM.getChromeStorage();
    var PPMSTORAGE = PPM.getPPMStorage();
    var UTILS = PPM.getUtils();
    var ___CALPCSD_PC, ___CALPCSD_CB = null;//_checkAndLoadPCSecureData temporary variables
    var popupWin = window;//some callback functions will be in defferent scope so they might need this


    this.init = function () {
        _reinitPanels();
    }

    function _reinitPanels() {
        //log("init...");
        if(CHROMESTORAGE.isInited()) {
            _initMenuPanel();
        } else {
            _initLoginPanel();
        }
    }

    /*----------------------------------------------------------------------------------------------------LOGIN*/
    function _initLoginPanel() {
        $("#panel_menu").hide();
        $("#panel_login").hide();
        //
        $("select#encryptionscheme").val("PPM_ENCRYPTION_SCHEME_AESMD5");
        $("input#masterkey").val("");
        $("input#masterkey").passwordMask();
        //
        $("button#button_login").button().bind("click.ppm", _doLogin);
        setTimeout(function() {
            $("#panel_login").show();
            $("input#masterkey").focus();//--- //TODO: this only works in timeout
        }, 50);
    }

    function _doLogin() {
        var pn = $("select#profilename").val();//PROFILE TO USE
        var mk = $("input#masterkey").val();
        var es = $("select#encryptionscheme").val();
        log("Logging into profile: "+pn);
        //hide login button until we have result
        $("button#button_login").css("visibility","hidden");
        //
        PPM.init(pn, mk, es, _doLoginDone);
    }

    function _doLoginDone(loginResult) {
        if(loginResult) {
            log("logged in");
            $("button#button_login").unbind(".ppm");
            PPM.GATrackEvent("PPM","login");
            _reinitPanels();
            window.close();
        } else {
            log("NOT logged in");
            $( "#panel_login" ).effect( "shake", {}, 500, function() {
                //show login button again
                $("button#button_login").css("visibility","visible");
            });
        }
    }


    /*-------------------------------------------------------------------------------------------------------MENU*/
    function _initMenuPanel() {
        //check if there are passcards
        var matchingPasscards = UTILS.getPasscardsForCurrentTab();
        log("matching passcards: " + matchingPasscards.length);
        if(matchingPasscards.length > 0) {
            //remove old elements between li.separator1 & li.separator2
            $("ul#menu li.separator1").nextUntil($("ul#menu li.separator2"), "li").remove();
            //
            for(var i=0; i<matchingPasscards.length; i++) {
                _addPasscardToMenu(matchingPasscards[i]);
            }
        }

        //init menu widget
        $("ul#menu").menu({
            select: function(ev, ui) {
                var action =  ui.item.prop('title');
                if(action) {
                    _menuSelect(action);
                }
            }
        });

        //init interface
        var menuWidth = (matchingPasscards.length > 0?Number(CHROMESTORAGE.getOption("sync", "menu_width_withpc")):Number(CHROMESTORAGE.getOption("sync", "menu_width_nopc")));
        $("body").css("minWidth", menuWidth + "px");
        if(matchingPasscards.length == 0) {
            $("ul#menu li.separator2").hide();
        } else {
            $("ul#menu li.separator2").show();
        }
        $("#panel_login").hide();
        $("#panel_menu").show();
        PPM.GATrackEvent("POPUP","menuopen");
    }

    function _addPasscardToMenu(PC) {
        $("ul#menu li.separator1").after(function() {
            var menuitem = $(
                '<li class="passcard">' +
                '<a href="#">' +
                    '<span class="ui-icon '+(PC.hasSecure()?'ui-icon-unlocked':'ui-icon-locked')+'"></span>' + PC.get("name") +
                '</a>' +
                '' +
                    '<span class="ui-icon ui-icon-person pc-copy-un"></span>' +
                    '<span class="ui-icon ui-icon-key pc-copy-pw"></span>' +
                    '<span class="ui-icon ui-icon-gear pc-info"></span>' +
                '' +
                '</li>'
            );

            //ACTION - FILL IN PASSCARD
            $('a', menuitem).click(function() {
                _doMenuAction_Passcard_FillIn(PC);
            });

            //ACTION - PC INFO
            $('span.pc-info', menuitem).click(function(ev) {
                //ev.preventDefault();
                _doMenuAction_Passcard_Info(PC);
            });

            //ACTION - COPY USERNAME
            $('span.pc-copy-un', menuitem).click(function(ev) {
                PPM.GATrackEvent("POPUP","copyusername");
                _checkAndLoadPCSecureData(PC, function() {
                    UTILS.copyTextToClipboard(PC.get("username"));
                    $("#panel_internal").hide();
                    $("#panel_menu").show();
                });
            });

            //ACTION - COPY PASSWORD
            $('span.pc-copy-pw', menuitem).click(function(ev) {
                PPM.GATrackEvent("POPUP","copypassword");
                _checkAndLoadPCSecureData(PC, function() {
                    UTILS.copyTextToClipboard(PC.get("password"));
                    $("#panel_internal").hide();
                    $("#panel_menu").show();
                });
            });

            //RIGHT ICON HOVERS
            $('span.pc-info, span.pc-copy-un, span.pc-copy-pw', menuitem).hover(function(ev) {
                $(this).css("background-image", "url(css/jquery-ui-theme/images/ui-icons_ffffff_256x240.png)");
            }, function(ev) {
                $(this).css("background-image", "url(css/jquery-ui-theme/images/ui-icons_222222_256x240.png)");
            });

            return(menuitem);
        });
    }

    function _menuSelect(action) {
        switch (action) {
            case "logout":
                _doMenuAction_Logout();
                break;
            case "newpasscard":
                _doMenuAction_NewPasscard();
                break;
            case "pwdgenerator":
                _doMenuAction_PwdGenerator();
                break;
            case "configuration":
                _doMenuAction_Configuration();
                break;
            case "information":
                _doMenuAction_Information();
                break;
            default:
                _BG_.PPMAlert("UNDEFINED MENU ACTION: " + action);
                _reinitPanels();
                break;
        }
    }
    //------------------------------------------------------------------------------------------------------LOGOUT
    function _doMenuAction_Logout() {
        _openInternalPanel("logoutPanel");

        $("#panel_internal #button_logout").button({
            icons: {primary: "ui-icon-power"}
        }).bind("click.ppm", function() {
            PPM.GATrackEvent("PPM","logout");
            UTILS.findAndCloseConfigurationTab(null);
            PPM.shutdown();
            window.close();
        });

        $("#panel_internal #button_logout_cancel").button({
            icons: {primary: "ui-icon-closethick"}
        }).bind("click.ppm", function() {
            _closeInternalPanel();
        });
    }
    //------------------------------------------------------------------------------------------------------NEW PASSCARD
    function _doMenuAction_NewPasscard() {
        PPM.GATrackEvent("POPUP","newpasscard");
        _openInternalPanel("newPasscardPanel", 450);

        //auto-fill in values for current tab
        var cT = UTILS.getCurrentTab();
        if(cT){
            $("#panel_internal #input_npc_name").val(cT.title);
            var url = cT.url;
            if(url.length > 0 && url.indexOf("/") != -1 ) {
                var urlPieces = url.split("/");
                if(urlPieces && urlPieces[2] && urlPieces[2].length > 0) {
                    var domName = urlPieces[2];
                    $("#panel_internal #input_npc_url").val(domName);
                }
            }
        }
        //auto-fill in values from config
        $("#panel_internal #input_npc_username").val(CHROMESTORAGE.getOption("sync", "passcard_default_username"));
        if(CHROMESTORAGE.getOption("sync", "passcard_autofill_password") === true) {
            $("#panel_internal #input_npc_password").val(UTILS.generatePassword());
        }
        $("#panel_internal #input_npc_password").passwordMask({ isShown: false });//pwd is shown by default - make option for this

        //focus on first field and select its content
        $("#panel_internal #input_npc_name").focus().select();


        var passcardSaveDone = function() {
            log("passcardSaveDone!");
            //! this callback is executed before PPMUTILS will have updated the currentTab.passcards count so if you call
            //_closeInternalPanel() directly to refresh menu items it will be missing your new passcard
            //we could have a timeout(ugly solution) or create a specific function in utils to force count update with callback
            //_closeInternalPanel();
            //;) easy solution - close menu
            window.close();
        }

        //BUTTON - SAVE
        $("#button_npc_save").button({
            icons: {primary: "ui-icon-disk"}
        }).bind("click.ppm", function() {
            if ($("#panel_internal #input_npc_name").val() != "" && $("#panel_internal #input_npc_url").val() != "") {
                var s = {
                    id: null,
                    parent_id: null,
                    collection: 'passcard',
                    name: $("#panel_internal #input_npc_name").val(),
                    identifier: $("#panel_internal #input_npc_url").val(),
                    secure: {
                        username: $("#panel_internal #input_npc_username").val(),
                        password: $("#panel_internal #input_npc_password").val()
                    },
                    params: null
                };

                $("#panel_login").hide();
                $("#panel_menu").hide();
                $("body").html('<p style="text-align: center;">Saving...</p>');

                PPMSTORAGE.addNewPasscard(s, passcardSaveDone);
            } else {
                $("#panel_internal").effect( "shake", {}, 500, function() {
                    //output some error msg?!
                });
            }
        });

        //BUTTON - CANCEL
        $("#button_npc_cancel").button({
            icons: {primary: "ui-icon-closethick"}
        }).bind("click.ppm", function() {
            _closeInternalPanel();
        });
    }



    //------------------------------------------------------------------------------------------------------PWD GENERATOR
    function _doMenuAction_PwdGenerator() {
        PPM.GATrackEvent("POPUP","pwdgen");
        _openInternalPanel("pwdGenPanel");

        /**
         * Generates new Password, sets it to textarea and copies to clipboard
         */
        var pwgenRegeneratePassword = function() {
            var pwd = UTILS.generatePassword();
            $("#panel_internal #genpwd").val(pwd);
            UTILS.copyTextToClipboard(pwd);
        };

        //PWLENGTH - SLIDER
        $( "#panel_internal #pwlength-slider" ).slider({
            min: 6,
            max: 128,
            step: 2,
            value: CHROMESTORAGE.getOption("sync", "pwgen_length"),
            slide: function( event, ui ) {
                var pwlen = ui.value;
                $( "#pwlength" ).html( ui.value );
                CHROMESTORAGE.setOption("sync", "pwgen_length", pwlen);
                pwgenRegeneratePassword();
            }
        });
        $( "#pwlength" ).html( $( "#panel_internal #pwlength-slider" ).slider( "value" ) );


        //PWD CHARACTER TYPES
        $("#pwdchars_alpha_lower").prop("checked", CHROMESTORAGE.getOption("sync", "pwgen_use_alpha_lower")).bind("click.ppm", function() {
            CHROMESTORAGE.setOption("sync", "pwgen_use_alpha_lower", $(this).prop("checked"));
            pwgenRegeneratePassword();
        });
        $("#pwdchars_alpha_upper").prop("checked", CHROMESTORAGE.getOption("sync", "pwgen_use_alpha_upper")).bind("click.ppm", function() {
            CHROMESTORAGE.setOption("sync", "pwgen_use_alpha_upper", $(this).prop("checked"));
            pwgenRegeneratePassword();
        });
        $("#pwdchars_numeric").prop("checked", CHROMESTORAGE.getOption("sync", "pwgen_use_numeric")).bind("click.ppm", function() {
            CHROMESTORAGE.setOption("sync", "pwgen_use_numeric", $(this).prop("checked"));
            pwgenRegeneratePassword();
        });
        $("#pwdchars_special").prop("checked", CHROMESTORAGE.getOption("sync", "pwgen_use_special")).bind("click.ppm", function() {
            CHROMESTORAGE.setOption("sync", "pwgen_use_special", $(this).prop("checked"));
            pwgenRegeneratePassword();
        });
        $( "#pwdchars" ).buttonset();


        //PASSWORD PANEL
        pwgenRegeneratePassword();


        //BUTTONS
        $("#panel_internal #button_pwgen").button({
            icons: {primary: "ui-icon-script"}
        }).bind("click.ppm", function() {
            $("#panel_internal #genpwd").val(UTILS.generatePassword());
            UTILS.copyTextToClipboard($("#panel_internal #genpwd").val());
        });

        $("#panel_internal #button_pwgen_cancel").button({
            icons: {primary: "ui-icon-closethick"}
        }).bind("click.ppm", function() {
            $( "#panel_internal #pwlength-slider" ).slider("destroy");
            $( "#pwdchars" ).buttonset("destroy");
            _closeInternalPanel();
        });




    }

    //------------------------------------------------------------------------------------------------------OPEN CONFIGURATION
    function _doMenuAction_Configuration() {
        PPM.GATrackEvent("POPUP","goconfig");
        chrome.tabs.query({title:"PPM Configuration"}, function(tabs) {
            if (tabs.length) {
                var tab = tabs[0];
                chrome.windows.getCurrent({populate:false}, function(win) {
                    //_BG_.PPMAlert("TAB-WID:" + tab.windowId + " - CWID:" + win.id);
                    if(tab.windowId == win.id) {
                        chrome.tabs.update(tab.id, {url: 'options.html', active: true}, function(tab){
                            window.close();//close popup
                        });
                    } else {
                        chrome.tabs.move(tab.id, {windowId: win.id, index:-1}, function(tab) {
                            chrome.tabs.update(tab.id, {url: 'options.html', active: true}, function(tab){
                                window.close();//close popup
                            });
                        });
                    }
                });
            } else {
                chrome.tabs.create({url: 'options.html'}, function(tab){
                    window.close();//close popup
                });
            }
        });
    }

    //------------------------------------------------------------------------------------------------------INFO
    function _doMenuAction_Information() {
        PPM.GATrackEvent("POPUP","ppminfo");
        _openInternalPanel("infoPanel");

        $("#panel_internal #button_info_close").button({
            icons: {primary: "ui-icon-closethick"}
        }).bind("click.ppm", function() {
                _closeInternalPanel();
            }
        );
    }

    //------------------------------------------------------------------------------------------------------PASSCARD
    function _doMenuAction_Passcard_FillIn(PC) {
        PPM.GATrackEvent("POPUP","passcardfill");
        log("Filling in un/pass per PC: " + PC.get("id"));
        _checkAndLoadPCSecureData(PC, function() {
            var cT = UTILS.getCurrentTab();
            chrome.tabs.sendMessage(cT.id, {
                "type":"LOGIN_PASSWORD_FILL",
                "username": PC.get("username"),
                "password": PC.get("password")
            });
            popupWin.close();
        });
    }

    function _doMenuAction_Passcard_Info(PC) {
        PPM.GATrackEvent("POPUP","passcardinfo");
        log("opening PCPanel per PC: " + PC.get("id"));
        _checkAndLoadPCSecureData(PC, function() {
            _openInternalPanel("passcardInfoPanel");

            $(".passcard_details").html(''+
                'Name: ' +  PC.get("name") + '<br />' +
                'Identifier: ' +  PC.get("identifier") + '<br />' +
                'Username: ' +  PC.get("username") + '<br />' +
                'Password: ' +  PC.get("password") + '<br />' +
                ''
            );

            $("#button_pcpanel_close").button({
                icons: {primary: "ui-icon-closethick"}
            }).bind("click.ppm", function() {
                    _closeInternalPanel();
                }
            );

        });
    }



    //------------------------------------------------------------------------------------------------------GENERAL
    function _openInternalPanel(contentPanelName, customWidth) {
        var contentPanel = $("#"+contentPanelName);
        var cW = (!customWidth?250:customWidth);
        if(contentPanel.length) {
            var panelHtml = contentPanel.html();
            $("ul#menu").menu("destroy");
            $("#panel_menu").hide();
            $("#panel_internal").html(panelHtml).width(cW).show();
        } else {
            _BG_.PPMAlert("No internal panel by that ID! " + contentPanelName);
        }
    }

    function _closeInternalPanel() {
        $("#panel_internal .button").unbind(".ppm");//unbind any action on any button classed element
        $("#panel_internal").hide();
        _reinitPanels();
    }

    /* moved to UTILS
    function _closeConfigurationTab(callback) {
        chrome.tabs.query({title:"PPM Configuration"}, function(tabs) {
            if (tabs.length) {
                var tab = tabs[0];
                chrome.tabs.remove(tab.id, callback);
            } else {
                if(callback) {callback();};
            }
        });
    }
    */

    var _checkAndLoadPCSecureData = function(PC, callback) {
        //___CALPCSD_PC = PC;
        ___CALPCSD_CB = callback;
        if(!PC.hasSecure()) {
            log("loading secure data for passcard #"+PC.get("id"));
            $("#panel_menu").hide();
            $("#panel_internal").show().html('<p style="text-align: center;">Loading...</p>');
            PC.loadSecure(_checkAndLoadPCSecureDataDone);
        } else {
            _checkAndLoadPCSecureDataDone();
        }
    }
    var _checkAndLoadPCSecureDataDone = function() {
        $("#panel_internal").hide();
        if (___CALPCSD_CB && typeof ___CALPCSD_CB == "function") {
            ___CALPCSD_CB();
        }
    }



    var log = function(msg) {PPM.log(msg, _logzone)};//just for comodity
}

var PPP;
$("document").ready(function() {
    PPP = new PopupPanel();
    PPP.init();
});

