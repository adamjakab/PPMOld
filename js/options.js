function OptionsPanel() {
    var _logzone = 'OptionsPanel';
    var _BG_ = chrome.extension.getBackgroundPage();
    var PPM = _BG_.PPM;
    var CHROMESTORAGE = PPM.getChromeStorage();
    var PPMSTORAGE = PPM.getPPMStorage();
    var CRYPTER = PPM.getCrypter();
    var UTILS = PPM.getUtils();
    var self = this;

    this.init = function() {
        if(!CHROMESTORAGE.isInited()) {
            $("#content").hide();
            $("body").html("<h1>YOU ARE NOT LOGGED IN!</h1>");
        } else {
            //init TABS
            var tabIndex = Number(CHROMESTORAGE.getOption("local", "options_tab_index"));
            $( "#content" ).tabs({
                active: tabIndex,
                activate: function( event, ui ) {
                    var tabIndex = Number($(this).tabs("option","active"));
                    log("active tab: " + tabIndex);
                    CHROMESTORAGE.setOption("local", "options_tab_index", tabIndex);
                    initTab(tabIndex);
                }
            });
            initTab(tabIndex);
        }
    }





    function initTab(tabIndex) {
        switch(tabIndex) {
            case 0:
                uninitAllTabs();
                initTabPasscards();
                break;
            case 1:
                uninitAllTabs();
                initTabServers();
                break;
            case 2:
                uninitAllTabs();
                initTabOptions();
                break;
            default:
                break;
        }
    }

    function uninitAllTabs() {
        $("#content .button").unbind(".ppm");//unbind any action on any button classed element
        uninitTabPasscards();
        uninitTabServers();
        uninitTabOptions();
    }


    //-------------------------------------------------------------------------------------PASSCARDS
    function initTabPasscards() {
        log("Passcards initing...");
        if(!areAllPasscardsReady()) {
            var d = $("#modaldialog");
            $("div.dialogtext", d).html('<div id="progressbar"><div class="label" style="float: left; margin-left: 50%; margin-top: 5px;"></div></div>');
            $("#progressbar",d).progressbar({value: false});

            $("#modaldialog").dialog({
                    title: "Loading parameters",
                    width: 600,
                    height:200,
                    modal: true,
                    buttons: {
                        "Cancel" : function() {
                            $("#modaldialog").dialog("close");
                            //
                        }
                    }
                }
            );
            //
            var storageData = PPMSTORAGE.getStorageData();
            log("Passcards to list: " + storageData.length);
            var SD;
            for(var i=0; i<storageData.length; i++) {
                SD = storageData[i];
                if(!SD.hasParams()) {
                    SD.loadParams(areAllPasscardsReady);
                }
            }
        }
    }

    function areAllPasscardsReady() {
        var storageData = PPMSTORAGE.getStorageData();
        var max = storageData.length;
        var cnt = 0;
        for(var i=0; i<max; i++) {
            if(storageData[i].hasParams()) {
                cnt++;
            }
        }
        log("PCREADY:" + cnt + "/" + max);
        if(cnt==max) {
            if($("#modaldialog").hasClass("ui-dialog-content")){
                $("#modaldialog").dialog("close");
                //------------------------this causes error if there is no dialog
            }
            initTabsPasscards2();
            return(true);
        } else {
            var perc = Math.round(100 * cnt / max);
            var d = $("#modaldialog");
            $("#progressbar", d).progressbar( "option", "value", perc );
            $("#progressbar .label", d).text("" + cnt+"/"+max);
            return(false);
        }
    }



    function initTabsPasscards2() {

        //Data
        var SD, TD;
        var tableData = new Array();
        var storageData = PPMSTORAGE.getStorageData();
        for(var i=0; i<storageData.length; i++) {
            SD = storageData[i];
            TD = [
                SD.get("id"),
                SD.get("name"),
                SD.get("identifier"),
                SD.get("collection"),
                    '<div class="b_pcedit button ui-icon ui-icon-wrench" title="edit"></div>' +
                    '<div class="b_pcdelete button ui-icon ui-icon-trash" title="delete"></div>'
                ];
            tableData.push(TD);
        }


        //the table #pctable
        $("#tab-passcards .dataholder").html('<table cellpadding="0" cellspacing="0" border="0" class="display" id="pctable"></table>');


        var dT = $('#pctable').dataTable({
            /*DEFAULTS*/
            "bPaginate": false,
            "bLengthChange": false,
            "bFilter": true,
            "bSort": true,
            "bInfo": true,
            "bAutoWidth": false,

            /*pager length*/
            "iDisplayLength": 25,
            "aLengthMenu": [[25, 50, 100, -1], [25, 50, 100, "All"]],
            /*use JQueryUI Style*/
            "bJQueryUI": true,
            /*COLUMNS*/
            "aoColumns": [
                { "sTitle": "Id" },
                { "sTitle": "name" },
                { "sTitle": "identifier" },
                { "sTitle": "collection", sWidth: 150 },
                { "sTitle": "OPS", sWidth: 30 }
            ],
            /*COLUMN DEFINITIONS*/
            "aoColumnDefs": [
                { "bSearchable": true, "bVisible": false, "aTargets": [ 0 ] }/*ID*/
            ],
            /*COLUMN DEFAULT SORTING*/
            "aaSorting": [[ 1, "asc" ]],/*NAME*/
            /*DATA*/
            "aaData": tableData,
            /*STATE LOAD/SAVE*/
            "bStateSave": true,
            "fnStateSave": function (oSettings, oData) {
                CHROMESTORAGE.setOption("local", "options_datatable_state", JSON.stringify(oData));
            },
            "fnStateLoad": function (oSettings) {
                return(JSON.parse(CHROMESTORAGE.getOption("local", "options_datatable_state")));
            }
    });

        //PC EDIT BUTTON
        $("#pctable .b_pcedit").bind("click.ppm", function(ev) {
            var tr = $(this).closest("tr").get(0);//must be DOM element NOT JQuery object
            if(tr) {
                ev.stopPropagation();
                editPasscard(dT.fnGetData(tr));
            }
        });

        //PC DELETE BUTTON
        dT.$(".b_pcdelete").bind("click.ppm", function(ev) {
            var tr = $(this).closest("tr").get(0);//must be DOM element NOT JQuery object
            if(tr) {
                ev.stopPropagation();
                deletePasscard(dT.fnGetData(tr));
            }
        });

    }

    function uninitTabPasscards() {
        log("Passcards uniniting...");
        $("#content").unbind(".ppm");//unbind all ppm domain events
        if($('#pctable').length) {
            $('#pctable').dataTable().fnDestroy();
        }
        $("#tab-passcards .dataholder").html('');
    }


    function editPasscard(pcdata) {
        var passcard = null;
        var d = $("#modaldialog");
        //
        var fillFields = function() {
            $("input#pc_id", d).val(passcard.get("id"));
            $("input#pc_name", d).val(passcard.get("name"));
            $("input#pc_identifier", d).val(passcard.get("identifier"));
            $("input#pc_username", d).val(passcard.get("username"));
            $("input#pc_password", d).val(passcard.get("password"));
            $("input#pc_password", d).passwordMask();
        }

        var fillParams = function() {
            //var cdate = UTILS.getHumanReadableDate(passcard.get("cdate"));
            //var cdate = passcard.get("cdate");
            //var cdate2 = new Date(1000*parseInt(passcard.get("cdate")));

            $("div.pcparams", d).html('' +
                '<p><b>Parameters</b></p>' +
                '<p>Created: '+UTILS.getHumanReadableDate(passcard.get("cdate"))+'</p>' +
                '<p>Modified: '+UTILS.getHumanReadableDate(passcard.get("mdate"))+'</p>'
            );
        }

        function addWarningToField(jQe) {
            jQe.css("backgroundColor", "#ff7d80");
        }

        function removeWarningFromField(jQe) {
            jQe.css("backgroundColor", "#ffffff");
        }

        function checkFields() {
            var answer = true;
            if($("input#pc_name", d).val().length == 0) {
                addWarningToField($("input#pc_name", d));
                answer = false;
            }
            if($("input#pc_identifier", d).val().length == 0) {
                addWarningToField($("input#pc_identifier", d));
                answer = false;
            }
            return(answer);
        }

        function saveData() {
            if(checkFields()) {
                passcard.set("name", $("input#pc_name", d).val());
                passcard.set("identifier", $("input#pc_identifier", d).val());
                passcard.set("username", $("input#pc_username", d).val(), "secure");
                passcard.set("password", $("input#pc_password", d).val(), "secure");
                passcard.save(null);
                $("#modaldialog").dialog("close");
                uninitTabPasscards();
                initTabPasscards();
            } else {
                $("#modaldialog").effect( "shake", {}, 500, function() {
                    //output some error msg?!
                });
            }
        }



        $("#modaldialog").dialog({
                title: "Modify Passcard",
                width: 600,
                height:450,
                modal: true,
                buttons: {},
                close: function() {
                    $("div.dialogtext", d).html("");//clear inner content
                }
            }
        );

        /*
         1) get ppmObject [passcard|urlcard|note] by id: 3883c393-6916-4d6f-a9f8-46a2e9e3ed55
         2) check if secure data is loaded
         3) load if not ... on callback init dialog
         */
        $("div.dialogtext", d).html("please wait...");
        passcard = PPMSTORAGE.getPasscardWithID(pcdata[0]);
        if(!passcard) {
            alert("NO PASSCARD BY THIS ID: " + pcdata[0]);
            return;
        }

        if(!passcard.hasSecure()) {
            $("div.dialogtext", d).html("Please wait...");
            passcard.loadSecure(passcardHasSecureData);
        } else {
            passcardHasSecureData();
        }

        function passcardHasSecureData() {
            var dialogHtml = $("#hidden_panel_contents div.modifyPasscard").html();
            $("div.dialogtext", d).html(dialogHtml);
            fillFields();
            fillParams();
            $("#modaldialog").dialog("option", "buttons", {
                "Save" : function() {
                    saveData();
                }
            });

            $("input", d).change(function() {
                removeWarningFromField($(this));
            });
        }

    }

    function deletePasscard(pcdata) {
        passcard = PPMSTORAGE.getPasscardWithID(pcdata[0]);
        if(!passcard) {
            alert("NO PASSCARD BY THIS ID: " + pcdata[0]);
            return;
        }
        if(confirm("Are you sure you want to delete this passcard forever?\n"+passcard.get("name"))) {
            log("PCDEL: " + passcard.get("id"));
            passcard.delete(function() {
                log("PC DELETED!");
                PPMSTORAGE.removePasscard(passcard);
                //this.handleStorageChanges will take care of updating tab content(will be triggered by UTILS when storage content changes)
            });
        }
    }









    //-------------------------------------------------------------------------------------SERVERS
    function initTabServers() {
        log("Servers initing...");

        $("#button_server_connection_config").button({
            icons: {primary: "ui-icon-wrench"}
        }).bind("click.ppm", function() {
                configureServerConnection();
            }
        );

        $("#button_server_encryption_config").button({
            icons: {primary: "ui-icon-wrench"}
        }).bind("click.ppm", function() {
                configureServerEncryption();
            }
        );
    }

    function uninitTabServers() {
        log("Servers uniniting...");
    }


    function configureServerConnection() {
        var d = $("#modaldialog");
        var dialogHtml = $("#hidden_panel_contents div.serverConfigOptions").html();
        $("div.dialogtext", d).html(dialogHtml);
        //
        var fillServerFields = function() {
            $("input#srv_0_name", d).val(CHROMESTORAGE.getOption("sync", "srv.0.name"));
            $("select#srv_0_type", d).val(CHROMESTORAGE.getOption("sync", "srv.0.type"));
            $("input#srv_0_url", d).val(CHROMESTORAGE.getOption("sync", "srv.0.url"));
            $("input#srv_0_username", d).val(CHROMESTORAGE.getOption("sync", "srv.0.username"));
            $("input#srv_0_password", d).val(CHROMESTORAGE.getOption("sync", "srv.0.password"));
            $("input#srv_0_password", d).passwordMask();
            //$("select#srv_0_encryption_scheme", d).val(CHROMESTORAGE.getOption("sync", "srv.0.encryption_scheme"));
            //$("input#srv_0_master_key", d).val(CHROMESTORAGE.getOption("sync", "srv.0.master_key"));
            $("input#srv_0_ping_interval", d).val(CHROMESTORAGE.getOption("sync", "srv.0.ping_interval"));
        }

        function addWarningToField(id) {
            $("label[for="+id+"]").css("backgroundColor", "#ff7d80");
        }
        function removeWarningFromField(id) {
            $("label[for="+id+"]").css("backgroundColor", "transparent");
        }

        function checkServerOptions() {
            var tmp;
            var answer = true;
            if($("input#srv_0_name", d).val().length == 0) {
                addWarningToField("srv_0_name");
                answer = false;
            }
            if($("input#srv_0_url", d).val().length == 0) {
                addWarningToField("srv_0_url");
                answer = false;
            }
            if($("input#srv_0_username", d).val().length == 0) {
                addWarningToField("srv_0_username");
                answer = false;
            }
            if($("input#srv_0_password", d).val().length == 0) {
                addWarningToField("srv_0_password");
                answer = false;
            }
            /*
            if(CRYPTER.checkKeyForEncryptionScheme($("select#srv_0_encryption_scheme", d).val(), $("input#srv_0_master_key", d).val()) !== true) {
                addWarningToField($("input#srv_0_master_key", d));
                answer = false;
            }*/

            //PING INTERVAL
            tmp = parseInt($("input#srv_0_ping_interval", d).val());
            if(tmp < 5 || tmp > 300) {
                addWarningToField("srv_0_ping_interval");
                answer = false;
            }
            return(answer);
        }

        function saveServerOptions() {
            if(checkServerOptions()) {
                $.blockUI({
                    message: '<p>Connecting to server('+$("input#srv_0_name", d).val()+'), please wait...</p>',
                    css: { backgroundColor: '#ffffff', color: '#000000', border: '1px solid #000000'}
                });

                CHROMESTORAGE.setOption("sync", "srv.0.name", $("input#srv_0_name", d).val());
                CHROMESTORAGE.setOption("sync", "srv.0.type", $("select#srv_0_type", d).val());
                CHROMESTORAGE.setOption("sync", "srv.0.url", $("input#srv_0_url", d).val());
                CHROMESTORAGE.setOption("sync", "srv.0.username", $("input#srv_0_username", d).val());
                CHROMESTORAGE.setOption("sync", "srv.0.password", $("input#srv_0_password", d).val());
                //CHROMESTORAGE.setOption("sync", "srv.0.encryption_scheme", $("select#srv_0_encryption_scheme", d).val());
                //CHROMESTORAGE.setOption("sync", "srv.0.master_key", $("input#srv_0_master_key", d).val());
                CHROMESTORAGE.setOption("sync", "srv.0.ping_interval", $("input#srv_0_ping_interval", d).val());

                $("#modaldialog").dialog("close");


                //we must force-save this stuff right away - otherwise if your session is killed
                //you will remain with old config and data will be saved with new config
                //which will not be good ;)
                CHROMESTORAGE.forceSyncStorageDataWriteout(function() {
                    PPMSTORAGE.reconnectAllServersAfterConfigChange(function(reconnectionResult) {
                        if(!reconnectionResult) {
                            alert("Could not connect to the server");
                            $.unblockUI();
                            configureServerConnection();
                        } else {
                            //phew! we are ok
                            $.unblockUI();
                        }
                    });
                });

            } else {
                $("#modaldialog").effect( "shake", {}, 500, function() {
                    //output some error msg?!
                });
            }
        }

        fillServerFields();
        $("input", d).each(function(i, el) {
            removeWarningFromField($(el).attr("id"));
        });
        $("input", d).change(function() {
            removeWarningFromField($(this).attr("id"));
        });



        $("#modaldialog").dialog({
            title: "Paranoia Server #0 Connection settings",
            width: 430,
            height:500,
            resizable: false,
            modal: true,
            buttons: {
                "Save & Re-connect" : function() {
                    saveServerOptions();
                }
            },
            close: function() {
                $("div.dialogtext", d).html("");//clear inner content
            }
        });
    }


    function configureServerEncryption() {
        var d = $("#modaldialog");
        var dialogHtml = $("#hidden_panel_contents div.serverEncryptionOptions").html();
        $("div.dialogtext", d).html(dialogHtml);

        var fillServerEncFields = function() {
            $("select#srv_0_encryption_scheme", d).val(CHROMESTORAGE.getOption("sync", "srv.0.encryption_scheme"));
            $("input#srv_0_master_key", d).val(CHROMESTORAGE.getOption("sync", "srv.0.master_key"));
            $("input#srv_0_master_key", d).passwordMask();
        }

        function addWarningToField(id) {
            $("label[for="+id+"]").css("backgroundColor", "#ff7d80");
        }

        function removeWarningFromField(id) {
            $("label[for="+id+"]").css("backgroundColor", "transparent");
        }

        function checkServerEncOptions() {
            var answer = true;
             if(CRYPTER.checkKeyForEncryptionScheme($("select#srv_0_encryption_scheme", d).val(), $("input#srv_0_master_key", d).val()) !== true) {
             addWarningToField($("input#srv_0_master_key", d));
             answer = false;
             }
            return(answer);
        }

        function saveServerEncOptions() {
            if(checkServerEncOptions()) {
                var blockmessage = '<p><b>Re-encrypting all your passcards...</b></p>'+
                        '<div class="progressbars">' +
                        'loading parameters<br /><div class="procbar pcload_P"><div class="fill"></div></div>' +
                        'loading secure data<br /><div class="procbar pcload_S"><div class="fill"></div></div>' +
                        'saving passcards<br /><div class="procbar pcsave"><div class="fill"></div></div>' +
                        '</div>'
                    ;
                $.blockUI({
                    message: blockmessage,
                    css: { backgroundColor: '#ffffff', color: '#000000', border: '1px solid #000000'}
                });

                CHROMESTORAGE.setOption("sync", "srv.0.encryption_scheme", $("select#srv_0_encryption_scheme", d).val());
                CHROMESTORAGE.setOption("sync", "srv.0.master_key", $("input#srv_0_master_key", d).val());
                $("#modaldialog").dialog("close");

                var showStaus = function(stats) {//PCLOAD_PARAM_PREC
                    var fullWidth = $("div.blockUI.blockMsg.blockPage .procbar").width();
                    if(stats&&stats.PCLOAD_PARAM_PREC){$("div.blockUI.blockMsg.blockPage .pcload_P .fill").width(Math.floor(fullWidth*stats.PCLOAD_PARAM_PREC/100));}
                    if(stats&&stats.PCLOAD_SECURE_PREC){$("div.blockUI.blockMsg.blockPage .pcload_S .fill").width(Math.floor(fullWidth*stats.PCLOAD_SECURE_PREC/100));}
                    if(stats&&stats.PCSAVE_PREC){$("div.blockUI.blockMsg.blockPage .pcsave .fill").width(Math.floor(fullWidth*stats.PCSAVE_PREC/100));}
                }
                showStaus({"PCLOAD_PARAM_PREC" : 0, "PCLOAD_SECURE_PREC" : 0, PCSAVE_PREC: 0});

                //we must force-save this stuff right away - otherwise if your session is killed
                //you will remain with old config and data will be saved with new config - which will not be good ;)
                CHROMESTORAGE.forceSyncStorageDataWriteout(function() {
                    PPMSTORAGE.fullyLoadAllPasscards(function() {
                        log("ALL PASSCARDS HAVE BEEN FULLY RELOADED.");
                        //servers must be reconnected so to use new ES/MK
                        PPMSTORAGE.reconnectAllServersAfterConfigChange(function(reconnectionResult) {
                            if(!reconnectionResult) {
                                alert("Could not connect to the server! Nothing was saved!");
                                $.unblockUI();
                            } else {
                                //phew! we are ok
                                PPMSTORAGE.resaveAllPasscards(function() {
                                    log("ALL PASSCARDS HAVE BEEN RE-SAVED.");
                                    $.unblockUI();
                                }, showStaus);
                            }
                        });
                    }, showStaus);
                });






            } else {
                $("#modaldialog").effect( "shake", {}, 500, function() {
                    //output some error msg?!
                });
            }
        }

        fillServerEncFields();
        $("input", d).each(function(i, el) {
            removeWarningFromField($(el).attr("id"));
        });
        $("input", d).change(function() {
            removeWarningFromField($(this).attr("id"));
        });


        $("#modaldialog").dialog({
            title: "Paranoia Server #0 Encryption settings",
            width: 430,
            height:300,
            resizable: false,
            modal: true,
            buttons: {
                "Save & Re-encrypt" : function() {
                    saveServerEncOptions();
                }
            },
            close: function() {
                $("div.dialogtext", d).html("");//clear inner content
            }
        });
    }










    //-------------------------------------------------------------------------------------OPTIONS
    function initTabOptions() {
        log("Options initing...");
        resetConfigOptions();

        $("#button_storage_options").button({
            icons: {primary: "ui-icon-wrench"}
        }).bind("click.ppm", function() {
                configureSyncStorageOptions();
            }
        );

        $("#button_options_save").button({
            icons: {primary: "ui-icon-disk"}
        }).bind("click.ppm", function() {
                saveConfigOptions();
            }
        );

        $("#button_options_reset").button({
            icons: {primary: "ui-icon-refresh"}
        }).bind("click.ppm", function() {
                resetConfigOptions();
            }
        );

    }

    function uninitTabOptions() {
        log("Options uniniting...");
        $("#button_options_save.ui-widget").button("destroy");
        $("#button_options_reset.ui-widget").button("destroy");
    }

    function resetConfigOptions() {
        fillOptionsFields();
        $( "#passcard_autofill_password" ).buttonset();
    }

    function fillOptionsFields() {
        //MENU
        $("input#menu_width_nopc").val(Number(CHROMESTORAGE.getOption("sync", "menu_width_nopc")));
        $("input#menu_width_withpc").val(Number(CHROMESTORAGE.getOption("sync", "menu_width_withpc")));
        //PWGEN - pwgen_specialchars
        $("input#pwgen_specialchars").val(CHROMESTORAGE.getOption("sync", "pwgen_specialchars"));
        //PASSCARD
        $("input#passcard_default_username").val(CHROMESTORAGE.getOption("sync", "passcard_default_username"));
        $("input#"+(CHROMESTORAGE.getOption("sync", "passcard_autofill_password")===true?"pcaf_y":"pcaf_n")).prop("checked","checked");

    }

    function saveConfigOptions() {
        //MENU
        CHROMESTORAGE.setOption("sync", "menu_width_nopc", Number($("input#menu_width_nopc").val()));
        CHROMESTORAGE.setOption("sync", "menu_width_withpc", Number($("input#menu_width_withpc").val()));
        //PWGEN
        CHROMESTORAGE.setOption("sync", "pwgen_specialchars", $("input#pwgen_specialchars").val());
        //PASSCARD
        CHROMESTORAGE.setOption("sync", "passcard_default_username", $("input#passcard_default_username").val());
        CHROMESTORAGE.setOption("sync", "passcard_autofill_password", $('input#pcaf_y').is(':checked'));

    }




    function configureSyncStorageOptions() {
        var d =  $("#modaldialog");
        var dialogHtml = $("#hidden_panel_contents div.syncStorageOptions").html();
        $("div.dialogtext",d).html(dialogHtml);
        var PnEsMk = CHROMESTORAGE.getCurrentSyncStoragePnEsMk();
        //_BG_.PPMAlert(JSON.stringify(PnEsMk));

        $("select#sync_option_es",d).val(PnEsMk.es);
        $("input#sync_option_mk",d).val(PnEsMk.mk);
        $("input#sync_option_mk",d).passwordMask();

        //ENCRYPTION TEST
        var testEncryption = function() {
            var answer = false;
            var esn = $("select#sync_option_es",d).val();
            var es = CRYPTER.getEncryptionScheme(esn);
            //
            var mk = $("input#sync_option_mk",d).val();
            var inputText = $("#sync_config_test_input",d).text();
            var mkTestRes = es.checkKey(mk);
            if(mkTestRes === true) {
                var output = es.encrypt(inputText, mk);
                answer = true;
            } else {
                //TEST FAILED
                var output = '<span class="error">' + mkTestRes + '</span>';
            }
            $("#sync_config_test_output",d).html(output);
            return(answer);
        }

        //ES CHANGE
        var ___ESChange = function() {
            var esn = $("select#sync_option_es",d).val();
            var es = CRYPTER.getEncryptionScheme(esn);
            var esDescHtml = ''
                + '<b>Name: </b>' + es.name + '<br />'
                + '<b>Description: </b>' + es.description + '<br />';
            $("#sync_option_es_desc",d).html(esDescHtml);
            testEncryption();
        }
        $("select#sync_option_es",d).change(___ESChange);
        ___ESChange();

        //MK CHANGE
        var ___MKChange = function() {
            testEncryption();
        }
        $("input#sync_option_mk",d).on("change keyup", ___MKChange);
        ___MKChange();



        $("#modaldialog").dialog({
                title: "Synced Storage Configuration Options",
                width: 600,
                height:600,
                modal: true,
                buttons: {
                    "Save & Re-encrypt" : function() {
                        if (testEncryption()) {
                            if(confirm("Are you sure?\nIf you click OK and go ahead your entire configuration will be re-encrypted with these new settings and you will be logged out.")) {
                                var es = $("select#sync_option_es",d).val();
                                var mk = $("input#sync_option_mk",d).val();
                                $(this).dialog("close");
                                CHROMESTORAGE.setCurrentSyncStorageEsMk(es, mk, function() {
                                    PPM.shutdown();
                                    UTILS.findAndCloseConfigurationTab(null);
                                    _BG_.PPMAlert("You have been logged out!");
                                });
                            }
                        }
                    }
                },
                close: function() {
                    $("div.dialogtext",d).html("");//clear inner content
                }
            }
        );
    }


    //------------------------------------------------------------------------------External Event Handler

    /**
     * Called by UTILS.handleStorageChangeEvent when PPMStorage dispatches Storage change events
     */
    this.handleStorageChanges = function() {
        var tabIndex = Number(CHROMESTORAGE.getOption("local", "options_tab_index"));
        log("Handling storage change for tab #"+tabIndex);
        if (tabIndex == 0) {
            //we are on passcards tab so we must update
            uninitTabPasscards();
            initTabPasscards();
        }
    }





    var log = function(msg) {PPM.log(msg, _logzone)};//just for comodity
}


var OPP;
$("document").ready(function() {
    OPP = new OptionsPanel();
    OPP.init();
});