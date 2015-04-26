/**
 * There is jQuery(1.9.1) support here!
 * User: jackisback
 * Date: 4/30/13
 * Time: 11:46 AM
 */

var _logzone = 'PPM(ContentScript)';

if(!chrome.extension.onMessage.hasListener(messageListener)) {
    chrome.extension.onMessage.addListener(messageListener);
}

function messageListener(data, sender, sendResponse) {
    //log("sender: " + sender.id);
    if(data && data.type) {
        if(data.type=="LOGIN_PASSWORD_FILL") {
            loginPasswordFill(data);
        }
    } else {
        log("Data type is missing!");
    }
}
log("READY");


function loginPasswordFill(data) {
    //alert("FILLING IN!\nlogin: "+data.username+"\npassword: "+data.password);
    var inputNodes = getAllInputNodesInContent();
    autodetect_and_fill_in_username_and_password_fileds(inputNodes, data.username, data.password);
    /*
    if(inputNodes.length > 0) {
        for(var ni=0; ni<inputNodes.length; ni++) {
            var IN = $(inputNodes[ni]);
            log("IN:" + "ID: " + IN.prop("id") + "/NAME: " + IN.prop("name"));
        }
    }
    */
}


var autodetect_and_fill_in_username_and_password_fileds = function(inputNodes, username, password) {
    //method: let's find the password field and the node before it 99.9% will be username field
    //unless the node before is a password field again - in that case it should be a registration form so we skip
    //once found we do NOT break out from loop 'coz there could be more than one login forms - i have one site like this out of 100000 but it is there
    var ni, node, node_pw, node_un;
    var INL = inputNodes.length;
    for (ni = 0; ni < INL; ni++) {
        node = $(inputNodes[ni]);
        log("NODE("+(ni+1)+"/"+INL + ")Name: " + node.prop("name") + " Type: " + node.prop("type"));

        if (node.prop("type") == "password") {
            node_pw = node;
            fill_in_this_filed(node_pw, password);
            node_un = $(inputNodes[ni-1]);//the previous node
            if (node_un.prop("type") != "password" && node_un.prop("type") != "hidden") {
                fill_in_this_filed(node_un, username);
                inputNodes.splice(ni-1,2);//remove both nodes
                ni -= 2;
                INL -= 2;
            } else {
                inputNodes.splice(ni,1);//remove only password field node
                ni -= 1;
                INL -= 1;
            }
        }
    }
}

var fill_in_this_filed = function(node,val) {
    try {
        if (node.prop("type") == "radio" || node.prop("type") == "checkbox") {
            node.checked = true;
        } else 	if (node.prop("tagName").toLowerCase() == "select") {
            /*
            var options = node.getElementsByTagName("option");
            for (var oi = 0; oi < options.length; oi++) {
                if (options[oi].getAttribute("value") == val) {
                    options[oi].setAttribute("selected", "selected");
                    node.selectedIndex = oi;
                } else {
                    options[oi].removeAttribute("selected");
                }
            }
            */
            log("MISSING!!!")
        } else {
            node.val(val);
        }
        if (1 == 1) {//colorize fields
            node.css("background", "#7cfc00").css("color", "#ff0000;");
        }
        if (1 == 2) {//autosubmit
            node.closest("form").submit();
        }
    } catch(e) {
        log("NODE FILL IN ERROR: " + e);
    }
}

function getAllInputNodesInContent() {
    var answer = [];
    try {
        //direcly in document
        $('input, select').each(function(i, el) {
            answer.push(el);
        });

        /*
        FRAME/IFRAME content - in most cases this will not work
         - to resolve this content script should be injected in all frames


        $('frame, iframe').each(function(i, frameDoc) {
            log("DIGGING INTO FRAME#"+ i + " : " + $(frameDoc).prop("src"));
            $('input, select', $(frameDoc).contents()).each(function(ii, el) {
                answer.push(el);
            });
        });
        */
    } catch(e){
        log("ERR: " + e);
    }
    return(answer);
}

function log(msg) {
    var ts = Date.now();
    var prefix = _logzone + "[" + ts + "]";
    prefix += ": ";
    console.log(prefix + msg);
}