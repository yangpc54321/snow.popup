(function () {
    addScript('js/inject.js');
})();


function addScript(filePath) {
    var s = document.createElement('script');
    s.src = chrome.runtime.getURL(filePath);
    s.onload = function () {
        var script = document.createElement('script');
        script.textContent = 'snuSettingsAdded()';
        (document.head || document.documentElement).appendChild(script);
    };

    (document.head || document.documentElement).appendChild(s);
}

//attach event listener from popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.method == "getVars")
        sendResponse({ myVars: getVars(request.myVars), url: location.origin, frameHref: getFrameHref() });
    return;
});

function getVars(varstring) {

    // if(window.frameElement && window.frameElement.nodeName == "IFRAME")
    //     return; //dont run in iframes

    if (varstring.indexOf('g_list') > -1)
        setGList();

    var doc;
    var ret = {};
    if (document.querySelectorAll('#gsft_main').length)
        doc = document.querySelectorAll('#gsft_main')[0].contentWindow.document;
    else if (document.querySelectorAll('div.tab-pane.active').length == 1) {

        try{
        ret.g_ck = jQuery('input#sysparm_ck').val();
        jQuery('iframe').removeClass('activetab');
        jQuery('div.tab-pane.active iframe').addClass('activetab');
        doc = jQuery('iframe.activetab')[0].contentWindow.document;
        }
        catch(ex){
            doc = document;
        }

    }
    else
        doc = document;


    var variables = varstring.replace(/ /g, "").split(",");
    var scriptContent = "";
    for (var i = 0; i < variables.length; i++) {
        var currVariable = variables[i];
        scriptContent += "try{ if (typeof window." + currVariable + " !== 'undefined') document.body.setAttribute('tmp_" + currVariable.replace(/\./g, "") + "', window." + currVariable + "); } catch(err){console.log(err);}\n"
    }


    var script = doc.createElement('script');
    script.id = 'tmpScript';
    script.appendChild(doc.createTextNode(scriptContent));
    doc.body.appendChild(script);

    for (var i = 0; i < variables.length; i++) {
        var currVariable = variables[i];
        ret[currVariable.replace(/\./g, "")] = $(doc.body).attr("tmp_" + currVariable.replace(/\./g, ""));
        $(doc.body).removeAttr("tmp_" + currVariable.replace(/\./g, ""));
    }

    $(doc.body).find("#tmpScript").remove();

    return ret;
}

function getFrameHref() {
    var frameHref = '';

    if (document.querySelectorAll('#gsft_main').length)
        frameHref = document.getElementById("gsft_main").contentWindow.location.href;
    else if (document.querySelectorAll('div.tab-pane.active').length == 1) {
        try{
            frameHref = document.querySelectorAll('iframe.activetab')[0].contentWindow.location.href;
        }
        catch (e){
            frameHref = document.location.href;
        }
    }
    else
        frameHref = document.location.href;

    return frameHref;
}